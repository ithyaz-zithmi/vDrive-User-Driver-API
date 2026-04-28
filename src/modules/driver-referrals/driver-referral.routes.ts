// src/modules/driver-referrals/driver-referral.routes.ts
// Driver referral routes

import { Router } from 'express';
import { DriverReferralController } from './driver-referral.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Public - validate a referral code (used during signup before auth)
router.post('/apply', DriverReferralController.applyReferralCode);

// Protected - requires auth
router.get('/code', isAuthenticated, DriverReferralController.getMyReferralCode);
router.get('/stats', isAuthenticated, DriverReferralController.getMyReferralStats);

export default router;
