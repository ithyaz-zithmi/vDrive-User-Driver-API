import { Gender, UserRole, UserStatus } from '../../enums/user.enums';
export interface User {
  id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  alternate_contact?: string;
  role: UserRole;
  gender?: Gender;
  date_of_birth?: Date;
  status: UserStatus;
  email?: string;
  device_id: string;
  fcm_token?: string;
  created_at?: Date;
  updated_at?: Date;
  is_trip_verified?: boolean;
}
