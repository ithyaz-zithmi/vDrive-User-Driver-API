import {
  CancelBy,
  CancelReason,
  PaymentStatus,
  RideType,
  ServiceType,
  TripStatus,
} from '../../enums/trip.enums';

export interface Trip {
  trip_id?: string;
  user_id: string;
  driver_id?: string;
  vehicle_id?: string;
  ride_type: RideType;
  service_type: ServiceType;
  trip_status: TripStatus;
  original_scheduled_start_time: Date;
  scheduled_start_time?: Date;
  actual_pickup_time?: Date;
  actual_drop_time?: Date;
  pickup_lat: number;
  pickup_lng: number;
  pickup_address: string;
  drop_lat: number;
  drop_lng: number;
  drop_address: string;
  distance_km: number;
  trip_duration_minutes?: number;
  waiting_time_minutes?: number;
  base_fare: number;
  waiting_charges?: number;
  driver_allowance?: number;
  platform_fee: number;
  total_fare: number;
  paid_amount?: number;
  payment_status: PaymentStatus;
  cancel_reason?: CancelReason;
  cancel_by?: CancelBy;
  notes?: string;
  rating?: number;
  re_route_id?: string;
  feedback?: string;
  assigned_at?: Date;
  started_at?: Date;
  ended_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}
