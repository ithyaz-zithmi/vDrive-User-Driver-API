// src/modules/notifications/notification.routes.ts
import { Router } from 'express';
import { NotificationController } from './notification.controller';

const router = Router();

// POST /api/notifications/test — send a test notification to a driver
router.post('/test', NotificationController.sendTestNotification);

// POST /api/notifications/send — send a notification to a driver
router.post('/send', NotificationController.sendNotification);

export default router;
