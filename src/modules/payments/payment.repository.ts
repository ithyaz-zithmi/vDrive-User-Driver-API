import { query } from '../../shared/database';
import { ICreatePaymentInput, IPayment } from './payment.model';

export const PaymentRepository = {
  async saveOrder(paymentData: ICreatePaymentInput): Promise<number> {
    const sql = `
      INSERT INTO payments (
        driver_id, plan_id, billing_cycle, amount, currency, razorpay_order_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const res = await query(sql, [
      paymentData.driver_id,
      paymentData.plan_id,
      paymentData.billing_cycle,
      paymentData.amount,
      paymentData.currency || 'INR',
      paymentData.razorpay_order_id,
      paymentData.status,
    ]);
    return res.rows[0].id;
  },

  async updateStatus(orderId: string, status: 'completed' | 'failed', paymentId?: string, signature?: string): Promise<void> {
    const sql = `
      UPDATE payments 
      SET status = $1, razorpay_payment_id = $2, razorpay_signature = $3, updated_at = NOW()
      WHERE razorpay_order_id = $4
    `;
    await query(sql, [status, paymentId || null, signature || null, orderId]);
  },

  async getOrder(orderId: string): Promise<IPayment | null> {
    const sql = 'SELECT * FROM payments WHERE razorpay_order_id = $1';
    const res = await query(sql, [orderId]);
    return res.rows[0] || null;
  }
};