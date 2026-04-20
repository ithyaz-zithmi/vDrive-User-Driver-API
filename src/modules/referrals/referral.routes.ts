// src/modules/referrals/referral.routes.ts
import { Router } from 'express';
import { ReferralController } from './referral.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Public routes
router.post('/pre-validate', ReferralController.preValidateCode);

// Routes strictly requiring authentication
router.use(isAuthenticated);

router.post('/generate', ReferralController.generateCode);
router.post('/validate', ReferralController.validateCode);
router.post('/apply-discount', ReferralController.applyDiscount);
router.get('/check-eligibility', ReferralController.checkEligibility);
router.get('/stats', ReferralController.getStats);
router.get('/code', ReferralController.getCode);

export default router;
