import { Joi } from 'celebrate';
import * as commonSchema from '../../validations/schema/common.schema';
import { validationMessages } from '../../validations/messages/validation.messages';

export const UserValidation = {
  idValidation: Joi.object().keys({
    id: validationMessages(commonSchema.userIdRule, 'userId'),
  }),

  createUserValidation: Joi.object().keys({
    name: validationMessages(commonSchema.userNameRule, 'name'),
    phoneNumber: validationMessages(commonSchema.phoneNumberRule, 'phoneNumber'),
    alternateNumber: validationMessages(commonSchema.alternateNumberRule, 'alternateNumber'),
    role: validationMessages(commonSchema.roleRule, 'role'),
    gender: validationMessages(commonSchema.genderRule, 'gender'),
    dateOfBirth: validationMessages(commonSchema.dateOfBirthRule, 'dateOfBirth'),
    status: validationMessages(commonSchema.statusRule, 'status'),
    email: validationMessages(commonSchema.emailRule, 'email'),
  }),

  updateUserValidation: Joi.object({
    name: validationMessages(commonSchema.userNameRule.optional(), 'name'),
    phoneNumber: validationMessages(commonSchema.phoneNumberRule.optional(), 'phoneNumber'),
    alternateNumber: validationMessages(
      commonSchema.alternateNumberRule.optional(),
      'alternateNumber'
    ),
    role: validationMessages(commonSchema.roleRule.optional(), 'role'),
    gender: validationMessages(commonSchema.genderRule.optional(), 'gender'),
    dateOfBirth: validationMessages(commonSchema.dateOfBirthRule.optional(), 'dateOfBirth'),
    status: validationMessages(commonSchema.statusRule.optional(), 'status'),
    email: validationMessages(commonSchema.emailRule.optional(), 'email'),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update user',
    }),

  deleteUserValidation: Joi.object().keys({
    id: validationMessages(commonSchema.userIdRule, 'userId'),
  }),
};
