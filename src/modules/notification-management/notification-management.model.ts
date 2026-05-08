export interface Notification {
  id?: string; // UUID
  title: string;
  body: string;
  target_type: 'CUSTOMER' | 'DRIVER';
  target_audience: 'ALL' | 'TOP_RIDE' | 'LOW_RIDE' | 'SPECIFIC';
  specific_user_id?: string[]; // We keep this as array for the model/logic
  attached_offer?: string; // UUID of coupon/promo
  coupon_code?: string;
  promo_code?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface NotificationDispatch {
  id?: number;
  notification_id: string; // UUID
  target_type: 'CUSTOMER' | 'DRIVER';
  target_audience: 'ALL' | 'TOP_RIDE' | 'LOW_RIDE' | 'SPECIFIC';
  specific_user_id?: string; // Back to single string for DB compatibility
  status?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processed_at?: Date;
  error_log?: string;
  created_at?: Date;
}
