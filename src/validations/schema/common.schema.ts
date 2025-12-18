import { Joi } from 'celebrate';
import { UserRole, Gender, UserStatus } from '../../enums/user.enums';
import { enumString } from '../../utilities/helper';

export const phoneNumberRule = Joi.string()
  .trim()
  .pattern(/^[0-9]{6,15}$/)
  .required()
  .messages({
    'string.empty': 'Phone number is required.',
    'string.pattern.base': 'Phone number must contain only digits (6–15 digits).',
    'any.required': 'Phone number is required.',
  });

export const roleRule = enumString(Object.values(UserRole)).messages({
  'any.only': 'Role must be one of: customer, driver.',
  'any.required': 'Role is required.',
});

export const emailRule = Joi.string()
  .trim()
  .lowercase()
  .email()
  .allow('', null)
  .optional()
  .messages({
    'string.base': 'Email must be a valid string',
    'string.email': 'Please enter a valid email address',
    'string.empty': 'Email cannot be empty',
  });

export const firstNameRule = Joi.string()
  .trim()
  .min(3)
  .max(30)
  .pattern(/^[a-zA-Z0-9\s]+$/)
  .required()
  .messages({
    'string.pattern.base': 'First Name can contain letters, numbers, and spaces only',
    'string.empty': 'First Name cannot be empty',
    'any.required': 'First Name is required.',
  });

export const lastNameRule = Joi.string()
  .trim()
  .min(1)
  .max(30)
  .pattern(/^[a-zA-Z0-9\s]+$/)
  .allow('', null)
  .optional();



export const genderRule = enumString(Object.values(Gender)).allow('', null).optional().messages({
  'string.base': 'Gender must be a string',
  'any.only': 'Gender must be one of: male, female, other',
  'string.empty': 'Gender cannot be empty',
});

export const alternateContactRule = Joi.string()
  .trim()
  .pattern(/^[0-9]{6,15}$/)
  .allow('', null)
  .optional()
  .messages({
    'string.base': 'Alternate contact number must be a string',
    'string.empty': 'Alternate contact number cannot be empty',
    'string.pattern.base': 'Alternate contact number must contain 6–15 digits',
  });

export const dateOfBirthRule = Joi.string()
  .trim()
  .pattern(/^(0?[1-9]|[12][0-9]|3[01])[-](0?[1-9]|1[012])[-]\d{4}$/)
  .allow('', null)
  .optional()
  .messages({
    'string.base': 'Date of birth must be a string',
    'string.empty': 'Date of birth cannot be empty',
    'string.pattern.base': 'Date of birth must be in DD-MM-YYYY format',
  });

export const statusRule = enumString(Object.values(UserStatus))
  .allow('', null)
  .optional()
  .messages({
    'string.base': 'Status must be a string',
    'any.only': 'Status must be one of: pending_verification, active, inactive, blocked, deleted',
    'string.empty': 'Status cannot be empty',
  });

export const idRule = Joi.string().guid({ version: 'uuidv4' }).messages({
  'string.base': 'User ID must be a string',
  'string.uuid': 'User ID must be a valid UUID v4',
  'string.empty': 'User ID cannot be empty',
  'any.required': 'User ID is required',
});

export const deviceIdRule = Joi.string().min(16).max(64).messages({
  'string.base': 'Device ID must be a string',
  'string.empty': 'Device ID cannot be empty',
  'string.min': 'Device ID must be at least 16 characters long',
  'string.max': 'Device ID cannot exceed 64 characters',
  'any.required': 'Device ID is required',
});
