// src/modules/drivers/driver.model.ts

export type DriverRole = string;
export type DriverStatus = string;

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

export interface Availability {
  online: boolean;
  lastActive: string | null;
}

export interface KYC {
  overallStatus: 'verified' | 'pending' | 'rejected' | string;
  verifiedAt: string | null;
}

export interface Credit {
  limit: number;
  balance: number;
  totalRecharged: number;
  totalUsed: number;
  lastRechargeAt: string | null;
}

export interface Recharge {
  transactionId: string;
  amount: number;
  paymentMethod: string;
  reference: string;
  status: string;
  createdAt: string;
}

export interface CreditUsage {
  usageId: string;
  tripId: string;
  amount: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface Vehicle {
  vehicleId: string;
  vehicleNumber: string;
  vehicleModel: string;
  vehicleType: string;
  fuelType: string;
  registrationDate: string;
  insuranceExpiry: string;
  rcDocumentUrl: string;
  status: boolean;
}

export interface Document {
  documentId: string;
  documentType: string;
  documentNumber: string;
  documentUrl: string;
  licenseStatus: string;
  expiryDate: string;
}

export interface Performance {
  averageRating: number;
  totalTrips: number;
  cancellations: number;
  lastActive: string | null;
}

export interface Payments {
  totalEarnings: number;
  pendingPayout: number;
  commissionPaid: number;
}

export interface ActivityLog {
  logId: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface Driver {
  driverId?: string;
  device_id?: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  phone_number: string;
  alternate_contact?: string;
  email: string;
  profilePicUrl?: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address?: Address;
  role: DriverRole;
  status: DriverStatus;
  rating?: number;
  total_trips?: number;
  availability?: Availability;
  kyc_status?: KYC;
  credit?: Credit;
  recharges?: Recharge[];
  creditUsage?: CreditUsage[];
  created_at?: string;
  updated_at?: string;
  vehicle?: Vehicle | null;
  documents?: Document[];
  performance?: Performance;
  payments?: Payments;
  activityLogs?: ActivityLog[];
  last_active?:string;
}

export interface CreateDriverInput {
  device_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone_number: string;
  alternate_contact?: string;
  email: string;
  profilePicUrl?: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address: Address;
  role: DriverRole;
  status: DriverStatus;
  vehicle?: Omit<Vehicle, 'vehicleId'>;
  documents?: Omit<Document, 'documentId'>[];
  kyc_status?: KYC;
  credit?: Credit;
  availability?: Availability;
  performance?: Performance;
  payments?: Payments;
}

export interface UpdateDriverInput extends Partial<
  Omit<
    CreateDriverInput,
    'vehicle' | 'documents' | 'kyc' | 'credit' | 'availability' | 'performance' | 'payments'
  >
> {
  driverId?: string;
  vehicle?: Partial<Vehicle>;
  documents?: Partial<Document>[];
  kyc?: Partial<KYC>;
  credit?: Partial<Credit>;
  availability?: Partial<Availability>;
  performance?: Partial<Performance>;
  payments?: Partial<Payments>;
}
