// src/modules/users/user.model.ts// src/modules/users/user.model.ts
export interface User {
  id: string;
  name: string;
  phone_number: string;
  alternate_contact?: string;
  role: 'customer' | 'driver';
  gender?: string;
  date_of_birth?: Date;
  status: string;
  email?: string;
  created_at: Date;
  updated_at: Date;
}
