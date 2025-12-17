import { Joi } from 'celebrate';

export const otpRule = Joi.string()
  .length(6)
  .pattern(/^[0-9]+$/)
  .required()
  .messages({
    'string.empty': 'OTP is required.',
    'string.length': 'OTP must be exactly 6 digits.',
    'string.pattern.base': 'OTP must be numbers only.',
    'any.required': 'OTP is required.',
  });

export const refreshTokenRule = Joi.string().required().messages({
  'string.empty': 'Refresh token is required.',
  'any.required': 'Refresh token is required.',
});

export const allowNewDeviceRule = Joi.boolean().required().messages({
  'boolean.base': 'allowNewDevice must be a boolean value',
  'any.required': 'Allow New Device is required.',
});
