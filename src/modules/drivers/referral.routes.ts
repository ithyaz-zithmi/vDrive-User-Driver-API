import { Router } from 'express';
import { ReferralController } from './referral.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Public - validate a referral code (used during signup before auth)
router.post('/apply', ReferralController.applyReferralCode);

// Protected - requires auth
router.get('/code', isAuthenticated, ReferralController.getMyReferralCode);
router.get('/stats', isAuthenticated, ReferralController.getMyReferralStats);

export default router;
