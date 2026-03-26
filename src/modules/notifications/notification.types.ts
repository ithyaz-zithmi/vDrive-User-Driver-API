export type NotificationRole = 'customer' | 'driver' | 'admin';

export interface NotificationPayload {
    type: string;
    title: string;
    body: string;
    data?: Record<string, string>;
}

export interface NotificationResult {
    success: boolean;
    messageId?: string;
    error?: string;
}

// ─── User Notification Types ──────────────────────────────────────────────────
export enum UserNotificationType {
    FORCE_LOGOUT = 'FORCE_LOGOUT',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    OTP_SENT = 'OTP_SENT',
    BOOKING_CONFIRM = 'BOOKING_CONFIRMED',
    BOOKING_CANCEL = 'BOOKING_CANCELLED',
    RIDE_CANCELLED = 'RIDE_CANCELLED',
    DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
    DRIVER_ARRIVED = 'DRIVER_ARRIVED',
    RIDE_STARTED = 'RIDE_STARTED',
    RIDE_COMPLETED = 'RIDE_COMPLETED',
    PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
}

// ─── Driver Notification Types ────────────────────────────────────────────────
export enum DriverNotificationType {
    FORCE_LOGOUT = 'FORCE_LOGOUT',
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    NEW_RIDE_REQUEST = 'NEW_RIDE_REQUEST',
    RIDE_CANCELLED = 'RIDE_CANCELLED',
    BOOKING_CANCELLED = 'BOOKING_CANCELLED',
    PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
    DOCUMENT_APPROVED = 'DOCUMENT_APPROVED',
    DOCUMENT_REJECTED = 'DOCUMENT_REJECTED',
    KYC_APPROVED = 'KYC_APPROVED',
    KYC_REJECTED = 'KYC_REJECTED',
    WALLET_CREDITED = 'WALLET_CREDITED',
    WALLET_DEBITED = 'WALLET_DEBITED',
    RIDE_STARTED = 'RIDE_STARTED',
    RIDE_COMPLETED = 'RIDE_COMPLETED',
}

// ─── Admin Notification Types ─────────────────────────────────────────────────
export enum AdminNotificationType {
    NEW_DRIVER_REGISTERED = 'NEW_DRIVER_REGISTERED',
    NEW_USER_REGISTERED = 'NEW_USER_REGISTERED',
    DOCUMENT_SUBMITTED = 'DOCUMENT_SUBMITTED',
    COMPLAINT_RAISED = 'COMPLAINT_RAISED',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
    SYSTEM_ALERT = 'SYSTEM_ALERT',
}