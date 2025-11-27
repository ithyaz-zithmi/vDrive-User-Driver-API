import { Joi } from 'celebrate';
import { UserRole, Gender, UserStatus } from '../../enums/user.enums';

export const phoneNumberRule = Joi.string()
  .trim()
  .pattern(/^[0-9]{6,15}$/)
  .required();

export const roleRule = Joi.string()
  .valid(...Object.values(UserRole))
  .required();

export const emailRule = Joi.string().trim().lowercase().email().allow('', null).optional();

export const userNameRule = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9\s]+$/)
  .required();

export const genderRule = Joi.string()
  .valid(...Object.values(Gender))
  .allow('', null)
  .optional();

export const alternateNumberRule = Joi.string()
  .trim()
  .pattern(/^[0-9]{6,15}$/)
  .allow('', null)
  .optional();

export const dateOfBirthRule = Joi.string()
  .trim()
  .pattern(/^(0?[1-9]|[12][0-9]|3[01])[-](0?[1-9]|1[012])[-]\d{4}$/)
  .allow('', null)
  .optional();

export const statusRule = Joi.string()
  .valid(...Object.values(UserStatus))
  .allow('', null)
  .optional();

export const userIdRule = Joi.string().uuid({ version: 'uuidv4' });
