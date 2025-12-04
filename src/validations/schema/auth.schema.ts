import { Joi } from 'celebrate';

export const otpRule = Joi.string()
  .length(6)
  .pattern(/^[0-9]+$/)
  .required();

export const refreshTokenRule = Joi.string().required();

export const allowNewDeviceRule = Joi.boolean().required();
