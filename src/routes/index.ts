import { Router } from 'express';
import userRoutes from '../modules/users/user.routes';
import authRoutes from '../modules/auth/auth.routes';
import isAuthenticated from '../shared/authentication';
import tripRoutes from '../modules/trip/trip.routes';

const router = Router();

router.get('/health-check', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is healthy' });
});

router.use('/auth', authRoutes);
router.use(isAuthenticated);
router.use('/users', userRoutes);
router.use('/trip', tripRoutes);

export default router;
