// src/modules/notifications/notification.service.ts
import * as admin from 'firebase-admin';
import { query } from '../../shared/database';
import { logger } from '../../shared/logger';
import * as path from 'path';
import * as fs from 'fs';

/* ================================================================
   FIREBASE ADMIN INITIALIZATION
   ================================================================ */

let firebaseInitialized = false;

function initializeFirebase(): void {
    if (firebaseInitialized) return;

    const serviceAccountPath = path.resolve(
        __dirname,
        '../../config/serviceAccountKey.json',
    );

    if (!fs.existsSync(serviceAccountPath)) {
        logger.warn(
            '⚠️  Firebase service account key not found at: ' + serviceAccountPath,
        );
        logger.warn(
            '   Download it from Firebase Console → Project Settings → Service Accounts',
        );
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(serviceAccountPath);

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    logger.info('✅ Firebase Admin SDK initialized');
}

// Initialize on module load
initializeFirebase();

/* ================================================================
   NOTIFICATION SERVICE
   ================================================================ */

// In-memory cache for simple rate limiting
const rateLimitCache = new Map<string, number>();

export const NotificationService = {
    /**
     * Send a push notification to a specific FCM token
     */
    async sendNotification(
        token: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<string | null> {
        if (!firebaseInitialized) {
            logger.error('Firebase not initialized — cannot send notification');
            return null;
        }

        try {
            const message: admin.messaging.Message = {
                notification: { title, body },
                token,
                android: {
                    priority: 'high' as const,
                    notification: {
                        sound: 'default',
                        channelId: 'ride_requests',
                    },
                },
                ...(data && { data }),
            };

            const messageId = await admin.messaging().send(message);
            logger.info(`✅ Notification sent: ${messageId}`);
            return messageId;
        } catch (error: any) {
            logger.error(`❌ Failed to send notification: ${error.message}`);

            // If the token is invalid/expired, auto-clear from database
            if (
                error.code === 'messaging/registration-token-not-registered' ||
                error.code === 'messaging/invalid-registration-token'
            ) {
                logger.warn('Token is invalid — clearing from database');
                try {
                    await query(
                        'UPDATE drivers SET fcm_token = NULL, updated_at = NOW() WHERE fcm_token = $1',
                        [token],
                    );
                    await query(
                        'UPDATE users SET fcm_token = NULL, updated_at = NOW() WHERE fcm_token = $1',
                        [token],
                    );
                    logger.info('✅ Stale FCM token cleared from database (Drivers/Users)');
                } catch (dbError: any) {
                    logger.error(`Failed to clear stale token: ${dbError.message}`);
                }
            }

            throw error;
        }
    },

    /**
     * Send a push notification to a driver by their ID
     * Looks up the driver's FCM token from the database
     */
    async sendNotificationToDriver(
        driverId: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<string | null> {
        try {
            const result = await query(
                'SELECT fcm_token FROM drivers WHERE id = $1',
                [driverId],
            );

            if (result.rows.length === 0) {
                logger.error(`Driver not found: ${driverId}`);
                throw { statusCode: 404, message: 'Driver not found' };
            }

            const fcmToken = result.rows[0].fcm_token;

            if (!fcmToken) {
                logger.warn(`No FCM token for driver: ${driverId}`);
                throw {
                    statusCode: 400,
                    message: 'Driver does not have an FCM token registered',
                };
            }

            return await this.sendNotification(fcmToken, title, body, data);
        } catch (error) {
            throw error;
        }
    },

    /**
     * Send a push notification to a user by their ID
     * Looks up the user's FCM token from the database
     */
    async sendNotificationToUser(
        userId: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<string | null> {
        try {
            const result = await query(
                'SELECT fcm_token FROM users WHERE id = $1',
                [userId],
            );

            if (result.rows.length === 0) {
                logger.error(`User not found: ${userId}`);
                throw { statusCode: 404, message: 'User not found' };
            }

            const fcmToken = result.rows[0].fcm_token;

            if (!fcmToken) {
                logger.warn(`No FCM token for user: ${userId}`);
                throw {
                    statusCode: 400,
                    message: 'User does not have an FCM token registered',
                };
            }

            return await this.sendNotification(fcmToken, title, body, data);
        } catch (error) {
            throw error;
        }
    },
};
