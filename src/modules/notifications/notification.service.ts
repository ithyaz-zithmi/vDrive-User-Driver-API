// src/modules/notifications/notification.service.ts
import * as admin from 'firebase-admin';
import { query } from '../../shared/database';
import { logger } from '../../shared/logger';
import { sendToDevice } from '../../config/firebase';

// 🛡️ Firebase is already initialized in src/app.ts via src/config/firebase.ts
// We just import 'admin' and it will be available.


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
        try {
            const result = await sendToDevice(token, {
                title,
                body,
                type: data?.type || 'notification',
                data,
                // Default to ride_requests if it looks like a ride-related notification
                androidChannelId: (data?.type === 'ride_request' || data?.type === 'NEW_RIDE_REQUEST') 
                    ? 'ride_requests' 
                    : 'default',
            });

            if (result.success) {
                return result.messageId || 'success';
            }

            // Handle invalid token cleanup if the error indicates it
            if (result.error === 'INVALID_TOKEN') {
                logger.warn(`Clearing invalid token for: ${token}`);
                await query('UPDATE drivers SET fcm_token = NULL WHERE fcm_token = $1', [token]);
                await query('UPDATE users SET fcm_token = NULL WHERE fcm_token = $1', [token]);
            }

            return null;
        } catch (error: any) {
            logger.error(`❌ NotificationService.sendNotification error: ${error.message}`);
            return null;
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
