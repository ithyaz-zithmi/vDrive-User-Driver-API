import Razorpay from 'razorpay';
import crypto from 'crypto';
import { SubscriptionRepository } from './subscription.repository';
import { CreateOrderRequest, VerifyPaymentRequest } from './subscription.model';
import { query, getClient } from '../../shared/database';
import axios from 'axios';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export const SubscriptionService = {
  async createOrder(driverId: string, input: CreateOrderRequest) {
    const plan = await SubscriptionRepository.getPlanById(input.plan_id);
    if (!plan) {
      throw new Error('Invalid plan ID or plan is not active');
    }

    let amount = 0;
    if (input.billing_cycle === 'day') amount = Number(plan.daily_price);
    else if (input.billing_cycle === 'week') amount = Number(plan.weekly_price);
    else if (input.billing_cycle === 'month') amount = Number(plan.monthly_price);
    else throw new Error('Invalid billing cycle');

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: 'INR',
      receipt: `sub_${driverId.substring(0, 8)}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    await SubscriptionRepository.createPayment({
      driver_id: driverId,
      plan_id: plan.id,
      billing_cycle: input.billing_cycle,
      amount: amount,
      currency: 'INR',
      razorpay_order_id: order.id,
      status: 'pending',
    });

    return {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
    };
  },

  async verifyPayment(driverId: string, input: VerifyPaymentRequest) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;

    // 1. Verify Signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Log failed verification
      console.error(`Invalid signature for order ${razorpay_order_id} and driver ${driverId}`);
      throw new Error('Invalid payment signature');
    }

    // 2. Fetch payment record
    const payment = await SubscriptionRepository.getPaymentByOrderId(razorpay_order_id);
    if (!payment || payment.status !== 'pending') {
      throw new Error('Payment record not found or already processed');
    }

    // 3. Database Transaction for secure activation
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Update payment status
      await SubscriptionRepository.updatePaymentStatus(razorpay_order_id, 'completed', razorpay_payment_id, razorpay_signature, client);

      // Check if driver already had an active subscription to mark this as a renewal
      const oldSub = await SubscriptionRepository.getActiveSubscription(driverId, client);
      const isRenewal = !!oldSub;

      // Expire old active subscription
      await SubscriptionRepository.expireActiveSubscription(driverId, client);

      // Calculate expiry date
      const startDate = new Date();
      const expiryDate = new Date();
      if (payment.billing_cycle === 'day') expiryDate.setDate(expiryDate.getDate() + 1);
      else if (payment.billing_cycle === 'week') expiryDate.setDate(expiryDate.getDate() + 7);
      else if (payment.billing_cycle === 'month') expiryDate.setMonth(expiryDate.getMonth() + 1);

      // Create new subscription
      await SubscriptionRepository.createSubscription({
        driver_id: driverId,
        plan_id: payment.plan_id,
        billing_cycle: payment.billing_cycle as any,
        start_date: startDate,
        expiry_date: expiryDate,
        status: 'active',
      }, client);

      // Update driver subscription status
      await client.query(
        `UPDATE drivers 
         SET subscription_active = true, 
             onboarding_status = 'SUBSCRIPTION_ACTIVE',
             updated_at = NOW() 
         WHERE id = $1`,
        [driverId]
      );

      await client.query('COMMIT');

      // Trigger webhook asynchronously for Admin App real-time notifications
      try {
        const driverRes = await client.query('SELECT full_name FROM drivers WHERE id = $1', [driverId]);
        const planRes = await client.query('SELECT plan_name FROM recharge_plans WHERE id = $1', [payment.plan_id]);
        
        const driverName = driverRes.rows[0]?.full_name || 'A driver';
        const planName = planRes.rows[0]?.plan_name || 'a subscription plan';

        const actionText = isRenewal ? 'renewed' : 'activated';

        const webhookUrl = process.env.ADMIN_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/driver-events';
        axios.post(webhookUrl, {
          eventType: isRenewal ? 'SUBSCRIPTION_RENEWED' : 'SUBSCRIPTION_ACTIVATED',
          message: `Driver ${driverName} ${actionText} ${planName}`,
          data: { driverId, planId: payment.plan_id, driverName, planName, isRenewal }
        }).catch(err => console.error(`Webhook trigger failed: ${err.message}`));
      } catch (e) {
        // Ignore 
      }

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction failed, rolled back:', error);
      throw error;
    } finally {
      client.release();
    }

    return { success: true };
  },

  async getMySubscription(driverId: string) {
    const subscription = await SubscriptionRepository.getActiveSubscription(driverId);
    if (!subscription) return null;

    const plan = await SubscriptionRepository.getPlanById(subscription.plan_id);
    return {
      subscription: {
        ...subscription,
        plan: plan,
      }
    };
  },

  async getAllActiveSubscriptions() {
    return await SubscriptionRepository.getAllActiveSubscriptions();
  }
};
