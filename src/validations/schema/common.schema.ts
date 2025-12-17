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

export const firstNameRule = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9\s]+$/)
  .required();

export const lastNameRule = Joi.string()
  .trim()
  .min(1)
  .max(30)
  .pattern(/^[a-zA-Z0-9\s]+$/)
  .required();

export const genderRule = Joi.string()
  .valid(...Object.values(Gender))
  .allow('', null)
  .optional();

export const alternateContactRule = Joi.string()
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

export const deviceIdRule = Joi.string().min(16).max(64);

export const pageRule = Joi.number().integer().min(1).default(1).optional();

export const limitRule = Joi.number().integer().min(1).max(100).default(10).optional();

export const searchRule = Joi.string().trim().min(1).max(100).optional().allow('');

export const roleFilterRule = Joi.string()
  .valid(...Object.values(UserRole))
  .optional();
