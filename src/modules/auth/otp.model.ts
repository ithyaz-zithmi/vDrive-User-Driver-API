export interface OTP {
  id: string;
  phone_number: string;
  role: 'customer' | 'driver';
  otp_hash: string;
  created_at: Date;
  expires_at: Date;
  attempt_count: number;
}
