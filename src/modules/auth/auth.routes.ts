// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller';
import isAuthenticated from '../../shared/authentication';
import { AuthValidation } from './auth.validator';
import { validateBody } from '../../utilities/helper';

const router = Router();

router.post(
  '/request-otp',
  validateBody(AuthValidation.requestOtpValidation),
  AuthController.requestOtp
);

router.post(
  '/verify-otp',
  validateBody(AuthValidation.verifyOtpValidation),
  AuthController.verifyOtp
);

router.post(
  '/refresh-token',
  validateBody(AuthValidation.refreshTokenValidation),
  AuthController.refreshAccessToken
);

router.use(isAuthenticated);
router.post('/signout', AuthController.signOut);

export default router;
