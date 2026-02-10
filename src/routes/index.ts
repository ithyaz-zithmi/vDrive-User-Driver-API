import { Router } from 'express';
import userRoutes from '../modules/users/user.routes';
import driverRoutes from '../modules/drivers/driver.routes';
import authRoutes from '../modules/auth/auth.routes';
import s3Routes from '../modules/s3/s3.routes';
import tripRoutes from '../modules/trip/trip.routes';
import { isAuthenticatedOrService } from '../shared/serviceAuthentication';

const router = Router();

router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

// ✅ PUBLIC ROUTES
router.use('/auth', authRoutes);
router.use('/drivers', driverRoutes); // 👈 ALLOW DRIVER SIGNUP WITHOUT TOKEN

// 🔒 PROTECTED ROUTES (TOKEN REQUIRED BELOW)
router.use(isAuthenticatedOrService);

router.use('/users', userRoutes);
router.use('/generate-presigned-url', s3Routes);
router.use('/trip', tripRoutes);

export default router;
