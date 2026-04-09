export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BLOCKED = 'blocked',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
  PENDING_VERIFICATION = 'pending_verification',
}

export enum OnboardingStatus {
  PENDING = 'pending',
  PHONE_VERIFIED = 'phone_verified',
  PROFILE_COMPLETED = 'profile_completed',
  COMPLETED = 'completed',
}

export interface SessionPayload {
  id: string;
  deviceId: string;
  role: string;
}
