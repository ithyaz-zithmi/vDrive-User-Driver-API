import { Joi } from 'celebrate';
import { validationMessages } from '../../validations/messages/validation.messages';
import { phoneNumberRule, roleRule } from '../../validations/schema/common.schema';
import { otpRule, refreshTokenRule } from '../../validations/schema/auth.schema';

export const AuthValidation = {
  requestOtpValidation: Joi.object().keys({
    phoneNumber: validationMessages(phoneNumberRule, 'phoneNumber'),
    role: validationMessages(roleRule, 'role'),
  }),

  verifyOtpValidation: Joi.object().keys({
    phoneNumber: validationMessages(phoneNumberRule, 'phoneNumber'),
    role: validationMessages(roleRule, 'role'),
    otp: validationMessages(otpRule, 'otp'),
  }),

  refreshTokenValidation: Joi.object({
    refreshToken: validationMessages(refreshTokenRule, 'refreshToken'),
  }),
};
