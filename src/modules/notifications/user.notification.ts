import { sendToDevice, sendToMultipleDevices } from '../../config/firebase';
import { UserNotificationType } from './notification.types';

export const UserNotifications = {

    forceLogout: (fcmToken: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.FORCE_LOGOUT,
            title: 'Session Ended',
            body: 'Your account was accessed from another device.',
        }),
    otpSent: (fcmToken: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.OTP_SENT,
            title: 'OTP Sent',
            body: 'Your OTP has been sent to your registered mobile number.',
        }),

    loginSuccess: (fcmToken: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.LOGIN_SUCCESS,
            title: 'Login Successful',
            body: 'You have successfully logged in.',
        }),

    bookingConfirmed: (fcmToken: string, bookingId: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.BOOKING_CONFIRM,
            title: 'Booking Confirmed',
            body: 'Your booking has been confirmed.',
            data: { bookingId },
        }),

    bookingCancelled: (fcmToken: string, bookingId: string, reason?: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.BOOKING_CANCEL,
            title: 'Booking Cancelled',
            body: reason || 'Your booking has been cancelled.',
            data: { bookingId, reason: reason ?? '' },
        }),

    rideCancelled: (fcmToken: string, bookingId: string, reason?: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.RIDE_CANCELLED,
            title: 'Ride Cancelled by Driver',
            body: `Your ride has been cancelled by the driver. Reason: ${reason}`,
            data: { bookingId, reason: reason ?? '' },
        }),

    driverAssigned: (fcmToken: string, driverName: string, bookingId: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.DRIVER_ASSIGNED,
            title: 'Driver Assigned! 🚗',
            body: `${driverName} is on the way to pick you up.`,
            data: { bookingId, driverName },
        }),
    driverArrived: (fcmToken: string, driverName: string, bookingId: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.DRIVER_ARRIVED,
            title: 'Driver Arrived! 🚗',
            body: `${driverName} has arrived at your location.`,
            data: { bookingId, driverName },
        }),

    rideStarted: (fcmToken: string, bookingId: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.RIDE_STARTED,
            title: 'Ride Started',
            body: 'Your ride has started. Have a safe journey!',
            data: { bookingId },
        }),

    rideCompleted: (fcmToken: string, bookingId: string, amount: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.RIDE_COMPLETED,
            title: 'Ride Completed',
            body: `Your ride is complete. Total: ₹${amount}`,
            data: { bookingId, amount },
        }),

    paymentSuccess: (fcmToken: string, amount: string, bookingId: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.PAYMENT_SUCCESS,
            title: 'Payment Successful',
            body: `Payment of ₹${amount} was successful.`,
            data: { bookingId, amount },
        }),

    paymentFailed: (fcmToken: string, bookingId: string) =>
        sendToDevice(fcmToken, {
            type: UserNotificationType.PAYMENT_FAILED,
            title: 'Payment Failed',
            body: 'Your payment could not be processed. Please try again.',
            data: { bookingId },
        }),
};