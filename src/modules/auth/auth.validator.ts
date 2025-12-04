import { Joi } from 'celebrate';
import { validationMessages } from '../../validations/messages/validation.messages';
import { phoneNumberRule, roleRule, deviceIdRule } from '../../validations/schema/common.schema';
import {
  otpRule,
  refreshTokenRule,
  allowNewDeviceRule,
} from '../../validations/schema/auth.schema';

export const AuthValidation = {
  requestOtpValidation: Joi.object().keys({
    phone_number: validationMessages(phoneNumberRule, 'phoneNumber'),
    role: validationMessages(roleRule, 'role'),
    device_id: validationMessages(deviceIdRule, 'deviceId'),
    allow_new_device: validationMessages(allowNewDeviceRule, 'allowNewDevice'),
  }),

  verifyOtpValidation: Joi.object().keys({
    phone_number: validationMessages(phoneNumberRule, 'phoneNumber'),
    role: validationMessages(roleRule, 'role'),
    otp: validationMessages(otpRule, 'otp'),
    device_id: validationMessages(deviceIdRule, 'deviceId'),
    allow_new_device: validationMessages(allowNewDeviceRule, 'allowNewDevice'),
  }),

  refreshTokenValidation: Joi.object({
    refreshToken: validationMessages(refreshTokenRule, 'refreshToken'),
    device_id: validationMessages(deviceIdRule, 'deviceId'),
  }),
};
