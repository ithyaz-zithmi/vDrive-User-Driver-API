export interface SubscriptionPlan {
  id: number;
  name: string;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  features: any;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface DriverSubscription {
  id: number;
  driver_id: string;
  plan_id: number;
  billing_cycle: 'day' | 'week' | 'month';
  start_date: Date;
  expiry_date: Date;
  status: 'active' | 'expired' | 'cancelled';
  created_at: Date;
  updated_at: Date;
}

export interface PaymentRecord {
  id: number;
  driver_id: string;
  plan_id: number;
  billing_cycle: string;
  amount: number;
  currency: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderRequest {
  plan_id: number;
  billing_cycle: 'day' | 'week' | 'month';
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
