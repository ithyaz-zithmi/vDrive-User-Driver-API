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
  driverId: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  profilePicUrl: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  address: Address;
  role: DriverRole;
  status: DriverStatus;
  rating: number;
  totalTrips: number;
  availability: Availability;
  kyc: KYC;
  credit: Credit;
  recharges: Recharge[];
  creditUsage: CreditUsage[];
  createdAt: string;
  updatedAt: string;
  vehicle: Vehicle | null;
  documents: Document[];
  performance: Performance;
  payments: Payments;
  activityLogs: ActivityLog[];
}

export interface CreateDriverInput {
  fullName: string;
  phoneNumber: string;
  email: string;
  profilePicUrl?: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  address: Address;
  role: DriverRole;
  status: DriverStatus;
  vehicle?: Omit<Vehicle, 'vehicleId'>;
  documents?: Omit<Document, 'documentId'>[];
  kyc?: KYC;
  credit?: Credit;
  availability?: Availability;
  performance?: Performance;
  payments?: Payments;
}

export interface UpdateDriverInput extends Partial<Omit<CreateDriverInput, 'vehicle' | 'documents' | 'kyc' | 'credit' | 'availability' | 'performance' | 'payments'>> {
  driverId?: string;
  vehicle?: Partial<Vehicle>;
  documents?: Partial<Document>[];
  kyc?: Partial<KYC>;
  credit?: Partial<Credit>;
  availability?: Partial<Availability>;
  performance?: Partial<Performance>;
  payments?: Partial<Payments>;
}
