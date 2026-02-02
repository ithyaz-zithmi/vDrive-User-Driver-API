import Razorpay from 'razorpay';
import crypto from 'crypto';
import { PaymentRepository } from '../payments/payment.repository';
import { IRazorpayOrderResponse, IVerifyPaymentRequest } from '../payments/payment.model';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
});

export const PaymentService = {
  async createRazorpayOrder(amount: number): Promise<IRazorpayOrderResponse> {
    try {
      const options = {
        amount: amount * 100, // INR to Paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      
      // Persist in DB
      await PaymentRepository.saveOrder(order);
      
      return order as IRazorpayOrderResponse;
    } catch (error) {
      console.error('Service Error (createOrder):', error);
      throw error;
    }
  },

  async verifySignature(data: IVerifyPaymentRequest): Promise<boolean> {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
      const secret = process.env.RAZORPAY_KEY_SECRET as string;

      const generated_signature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generated_signature === razorpay_signature) {
        await PaymentRepository.updateStatus(razorpay_order_id, 'PAID', razorpay_payment_id);
        return true;
      }
      
      await PaymentRepository.updateStatus(razorpay_order_id, 'FAILED');
      return false;
    } catch (error) {
      console.error('Service Error (verifySignature):', error);
      throw error;
    }
  }
};