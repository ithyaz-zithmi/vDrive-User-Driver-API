export interface RechargePlan {
  id?: number;
  plan_name: string;
  description?: string;
  ride_limit: number;
  validity_days: number;
  price: number;
  is_active: boolean;
  created_at?: Date;
}
