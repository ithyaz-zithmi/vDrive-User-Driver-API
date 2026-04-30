export interface Promo {
  id: number;
  code: string;
  description?: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  target_type: 'global' | 'specific_driver' | 'ride_count_based';
  target_driver_id?: string;
  min_rides_required: number;
  max_uses?: number;
  max_uses_per_driver: number;
  start_date: Date;
  expiry_date?: Date;
  is_active: boolean;
  promo_type: 'OFFER' | 'REFERRAL_REWARD';
  created_at: Date;
  updated_at: Date;
}

export interface PromoUsage {
  id: number;
  promo_id: number;
  driver_id: string;
  payment_id?: number;
  discount_applied: number;
  used_at: Date;
}

export interface ValidatePromoResponse {
  isValid: boolean;
  promo?: Promo;
  discountAmount: number;
  message?: string;
}
