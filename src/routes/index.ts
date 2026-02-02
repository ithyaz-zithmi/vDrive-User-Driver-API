import { Router } from 'express';
import userRoutes from '../modules/users/user.routes';
import driverRoutes from '../modules/drivers/driver.routes';
import authRoutes from '../modules/auth/auth.routes';
import s3Routes from '../modules/s3/s3.routes';
import { isAuthenticatedOrService } from '../shared/serviceAuthentication';
import emailRoutes from '../modules/email/email.routes';
import isAuthenticated from '../shared/authentication';
import tripRoutes from '../modules/trip/trip.routes';

const router = Router();

router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// S3 Proxy Route

router.use('/auth', authRoutes);
router.use(isAuthenticatedOrService);
router.use('/invoices',emailRoutes);
router.use(isAuthenticated);
router.use('/users', userRoutes);
router.use('/drivers', driverRoutes);
router.use('/generate-presigned-url', s3Routes);
router.use('/trip', tripRoutes);


export default router;
