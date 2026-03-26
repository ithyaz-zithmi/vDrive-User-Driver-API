import * as admin from 'firebase-admin';
import path from 'path';
import { logger } from '../shared/logger';
import { NotificationPayload, NotificationResult } from '../modules/notifications/notification.types';

// ─── Initialize Firebase Admin ────────────────────────────────────────────────
const initializeFirebase = (): void => {
    // ✅ Prevent re-initialization
    if (admin.apps.length > 0) return;

    try {
        const serviceAccountPath = path.resolve(
            __dirname,
            './vdrive-3edf7-firebase-adminsdk-fbsvc-3bfe5944c2.json'
        );

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccountPath),
        });

        logger.info('Firebase Admin initialized successfully');
    } catch (err: any) {
        logger.error(`Firebase Admin initialization failed: ${err.message}`);
        throw err;
    }
};

initializeFirebase();

// ─── Build FCM Message ────────────────────────────────────────────────────────
const buildMessage = (
    fcmToken: string,
    payload: NotificationPayload
): admin.messaging.Message => ({
    token: fcmToken,
    notification: {
        title: payload.title,
        body: payload.body,
    },
    data: {
        type: payload.type,
        ...(payload.data ?? {}),
    },
    android: {
        priority: 'high',
        notification: {
            sound: 'default',
            channelId: 'default',
            priority: 'high',
        },
    },
    apns: {
        headers: { 'apns-priority': '10' },
        payload: {
            aps: {
                sound: 'default',
                contentAvailable: true,
                badge: 1,
            },
        },
    },
});

// ─── Handle FCM Errors ────────────────────────────────────────────────────────
const handleFcmError = (err: any, fcmToken: string): NotificationResult => {
    const invalidTokenCodes = [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered',
        'messaging/invalid-argument',
    ];

    if (invalidTokenCodes.includes(err.code)) {
        logger.warn(`Invalid/expired FCM token: ${fcmToken}`);
        return { success: false, error: 'INVALID_TOKEN' };
    }

    if (err.code === 'messaging/message-rate-exceeded') {
        logger.warn('FCM rate limit exceeded');
        return { success: false, error: 'RATE_LIMIT_EXCEEDED' };
    }

    if (err.code === 'messaging/server-unavailable') {
        logger.warn('FCM server unavailable');
        return { success: false, error: 'SERVER_UNAVAILABLE' };
    }

    logger.error(`FCM unknown error: ${err.message}`);
    return { success: false, error: err.message };
};

// ─── Send to Single Device ────────────────────────────────────────────────────
export const sendToDevice = async (
    fcmToken: string,
    payload: NotificationPayload
): Promise<NotificationResult> => {
    if (!fcmToken?.trim()) {
        logger.warn('sendToDevice: empty FCM token');
        return { success: false, error: 'No FCM token provided' };
    }

    try {
        const message = buildMessage(fcmToken, payload);
        const messageId = await admin.messaging().send(message);

        logger.info(`[FCM] Sent. Type: ${payload.type} | MessageId: ${messageId}`);
        return { success: true, messageId };

    } catch (err: any) {
        return handleFcmError(err, fcmToken);
    }
};

// ─── Send to Multiple Devices ─────────────────────────────────────────────────
export const sendToMultipleDevices = async (
    fcmTokens: string[],
    payload: NotificationPayload
): Promise<NotificationResult[]> => {
    // ✅ Filter empty tokens
    const validTokens = fcmTokens.filter((t) => t?.trim());

    if (!validTokens.length) {
        logger.warn('sendToMultipleDevices: no valid FCM tokens');
        return [];
    }

    logger.info(`[FCM] Sending to ${validTokens.length} devices. Type: ${payload.type}`);

    const results = await Promise.allSettled(
        validTokens.map((token) => sendToDevice(token, payload))
    );

    return results.map((result, index) => {
        if (result.status === 'fulfilled') return result.value;
        logger.error(`[FCM] Failed for token[${index}]: ${result.reason}`);
        return { success: false, error: 'Promise rejected' };
    });
};

// ─── Send to Topic ────────────────────────────────────────────────────────────
export const sendToTopic = async (
    topic: string,
    payload: NotificationPayload
): Promise<NotificationResult> => {
    if (!topic?.trim()) {
        return { success: false, error: 'No topic provided' };
    }

    try {
        const message: admin.messaging.Message = {
            topic,
            notification: {
                title: payload.title,
                body: payload.body,
            },
            data: {
                type: payload.type,
                ...(payload.data ?? {}),
            },
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                    channelId: 'default',
                },
            },
            apns: {
                headers: { 'apns-priority': '10' },
                payload: {
                    aps: {
                        sound: 'default',
                        contentAvailable: true,
                    },
                },
            },
        };

        const messageId = await admin.messaging().send(message);
        logger.info(`[FCM] Sent to topic: ${topic}. MessageId: ${messageId}`);
        return { success: true, messageId };

    } catch (err: any) {
        logger.error(`[FCM] sendToTopic error: ${err.message}`);
        return { success: false, error: err.message };
    }
};

// ─── Subscribe to Topic ───────────────────────────────────────────────────────
export const subscribeToTopic = async (
    fcmToken: string,
    topic: string
): Promise<boolean> => {
    try {
        await admin.messaging().subscribeToTopic(fcmToken, topic);
        logger.info(`[FCM] Subscribed to topic: ${topic}`);
        return true;
    } catch (err: any) {
        logger.error(`[FCM] subscribeToTopic error: ${err.message}`);
        return false;
    }
};

// ─── Unsubscribe from Topic ───────────────────────────────────────────────────
export const unsubscribeFromTopic = async (
    fcmToken: string,
    topic: string
): Promise<boolean> => {
    try {
        await admin.messaging().unsubscribeFromTopic(fcmToken, topic);
        logger.info(`[FCM] Unsubscribed from topic: ${topic}`);
        return true;
    } catch (err: any) {
        logger.error(`[FCM] unsubscribeFromTopic error: ${err.message}`);
        return false;
    }
};

export default admin;
