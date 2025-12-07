export interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: 'rc' | 'insurance' | 'vehicle_license' | 'aadhaar_card';
  document_url?: string;
  status: 'pending' | 'verified' | 'rejected';
  uploaded_at: Date;
  verified_at?: Date;
  remarks?: string;
}

export enum DocumentType {
  RC = 'rc',
  INSURANCE = 'insurance',
  VEHICLE_LICENSE = 'vehicle_license',
  AADHAAR_CARD = 'aadhaar_card',
}

export enum DocumentStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}
