// src/modules/notifications/notification.controller.ts
import { Request, Response, NextFunction } from 'express';
import { NotificationService } from './notification.service';
import { successResponse } from '../../shared/errorHandler';
import { logger } from '../../shared/logger';

export const NotificationController = {
    /**
     * POST /api/notifications/test
     * Send a test push notification to a specific driver
     *
     * Body: { driverId: string, title?: string, body?: string }
     */
    async sendTestNotification(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const { driverId, title, body } = req.body;

            if (!driverId) {
                throw { statusCode: 400, message: 'driverId is required' };
            }

            const messageId = await NotificationService.sendNotificationToDriver(
                driverId,
                title || '🚗 New Ride Request',
                body || 'You have a new ride request nearby! Pickup is 2km away.',
                { type: 'test_notification' },
            );

            logger.info(`Test notification sent to driver ${driverId}: ${messageId}`);

            return successResponse(res, 200, 'Test notification sent successfully', {
                messageId,
                driverId,
            });
        } catch (err: any) {
            logger.error(`Error sending test notification: ${err.message}`);
            next(err);
        }
    },

    /**
     * POST /api/notifications/send
     * Send a push notification to a specific driver (for production use)
     *
     * Body: { driverId: string, title: string, body: string, data?: object }
     */
    async sendNotification(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
        try {
            const { driverId, title, body, data } = req.body;

            if (!driverId || !title || !body) {
                throw {
                    statusCode: 400,
                    message: 'driverId, title, and body are required',
                };
            }

            const messageId = await NotificationService.sendNotificationToDriver(
                driverId,
                title,
                body,
                data,
            );

            return successResponse(res, 200, 'Notification sent successfully', {
                messageId,
                driverId,
            });
        } catch (err: any) {
            logger.error(`Error sending notification: ${err.message}`);
            next(err);
        }
    },
};
