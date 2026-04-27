export interface SubscriptionPlan {
  id: number;
  name: string;
  plan_name: string;
  description?: string;
  plan_type?: string;
  ride_limit?: number;
  validity_days?: number;
  price?: number;
  daily_price: number;
  weekly_price: number;
  monthly_price: number;
  features: any;
  promo_code?: string;
  promo_discount?: number;
  first_recharge_discount?: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
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
  applied_promo_id?: number;
  discount_amount?: number;
  reward_amount_used?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateOrderRequest {
  plan_id: number;
  billing_cycle: 'day' | 'week' | 'month';
  promo_code?: string;
  use_reward_balance?: boolean;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
