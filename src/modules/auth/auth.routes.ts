// src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { AuthController } from './auth.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

router.post(
  '/request-otp',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      phone_number: Joi.string()
        .pattern(/^[0-9]{6,15}$/)
        .required()
        .messages({
          'string.empty': 'Phone number is required.',
          'string.pattern.base': 'Phone number must contain only digits (6–15 digits).',
        }),
      role: Joi.string().valid('customer', 'driver').required().messages({
        'any.only': 'Role must be one of: user, driver.',
      }),
    }),
  }),
  AuthController.requestOtp
);

router.post(
  '/verify-otp',
  celebrate({
    [Segments.BODY]: Joi.object().keys({
      phone_number: Joi.string()
        .pattern(/^[0-9]{6,15}$/)
        .required()
        .messages({
          'string.empty': 'Phone number is required.',
          'string.pattern.base': 'Phone number must contain only digits (6–15 digits).',
        }),
      role: Joi.string().valid('customer', 'driver').required().messages({
        'any.only': 'Role must be one of: customer, driver.',
      }),
      otp: Joi.string()
        .length(6)
        .pattern(/^[0-9]+$/)
        .required()
        .messages({
          'string.empty': 'OTP is required',
          'string.length': 'OTP must be exactly 6 digits',
          'string.pattern.base': 'OTP must be a number',
        }),
    }),
  }),
  AuthController.verifyOtp
);

router.post(
  '/refresh-token',
  celebrate({
    [Segments.BODY]: Joi.object({
      refreshToken: Joi.string().required().messages({
        'string.empty': 'Refresh token is required.',
        'any.required': 'Refresh token is required.',
      }),
    }),
  }),
  AuthController.refreshAccessToken
);

router.use(isAuthenticated);
router.get('/me', AuthController.getMe);
router.post('/signout', AuthController.signOut);

export default router;
