import { Router } from 'express';
import userRoutes from '../modules/users/user.routes';
import driverRoutes from '../modules/drivers/driver.routes';
import authRoutes from '../modules/auth/auth.routes';
import s3Routes from '../modules/s3/s3.routes';
import { isAuthenticatedOrService } from '../shared/serviceAuthentication';
import emailRoutes from '../modules/email/email.routes';
import isAuthenticated from '../shared/authentication';
import tripRoutes from '../modules/trip/trip.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import simulationRoutes from '../modules/simulation/simulation.routes';
import tripTransactionRoutes from '../modules/triptransactions/triptransaction.routes';
import pricingRoutes from '../modules/pricing/pricing.routes';

const router = Router();

router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// S3 Proxy Route

router.use('/auth', authRoutes);
router.use(isAuthenticatedOrService);
router.use('/invoices', emailRoutes);
router.use(isAuthenticated);
router.use('/trips', tripRoutes);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/generate-presigned-url', s3Routes);
router.use('/payment', paymentRoutes);
router.use('/simulation', simulationRoutes);
router.use('/triptransactions', tripTransactionRoutes);
router.use('/pricing', pricingRoutes);


export default router;
