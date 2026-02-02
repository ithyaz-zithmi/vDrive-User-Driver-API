import { Gender, UserRole, UserStatus } from '../../enums/user.enums';
export interface EmergencyContact {
  name: string;
  phone: string;
}
export interface User {
  id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  profile_url?: string;
  alternate_contact?: string;
  role: UserRole;
  gender?: Gender;
  date_of_birth?: Date;
  status: UserStatus;
  email?: string;
  device_id: string;
  settings_preferences?: {
    invoice_email: boolean;
    promo_email: boolean;
    whatsapp_updates: boolean;
    push_notifications: boolean;
    sms_alerts: boolean;
  };
  favourite_places?:{
    id:string;
    name:string;
    showname?:string;
    address:string;
    lat:number;
    lng:number
  }[];
  emergency_contacts?: EmergencyContact[];
  created_at?: Date;
  updated_at?: Date;
}
