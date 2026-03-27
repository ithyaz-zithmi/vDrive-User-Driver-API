import { Router } from 'express';
import userRoutes from '../modules/users/user.routes';
import driverRoutes from '../modules/drivers/driver.routes';
import authRoutes from '../modules/auth/auth.routes';
import s3Routes from '../modules/s3/s3.routes';
import tripRoutes from '../modules/trip/trip.routes';
import { isAuthenticatedOrService } from '../shared/serviceAuthentication';
import paymentRoutes from '../modules/payments/payment.routes';
import subscriptionRoutes from '../modules/subscriptions/subscription.routes';
import driverDocumentsRoutes from '../modules/drivers/driver-documents.routes';
import tripVerificationRoutes from '../modules/drivers/trip-verification.routes';
import adminRoutes from '../modules/admin/admin.routes';
import notificationRoutes from '../modules/notifications/notification.routes';
import sosRoutes from '../modules/sos/sos.routes';
import { logger } from '../shared/logger';

const router = Router();

router.get('/health-check', (req, res) => {
  logger.info('Health check called');
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// ✅ PUBLIC ROUTES
router.use('/auth', authRoutes);
router.use('/drivers/documents', driverDocumentsRoutes);
router.use('/drivers/trip-verification', tripVerificationRoutes);
router.use('/drivers', driverRoutes);
router.use('/s3', s3Routes);

// 🔒 PROTECTED ROUTES (TOKEN REQUIRED BELOW)
router.use((req, res, next) => {
  // Bypass auth for simulation routes
  if (req.originalUrl.includes('/test-simulate-')) {
    return next();
  }
  return isAuthenticatedOrService(req, res, next);
});

router.use('/users', userRoutes);
router.use('/trip', tripRoutes);
router.use('/payment', paymentRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/sos', sosRoutes);

export default router;


