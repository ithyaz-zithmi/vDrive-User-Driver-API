import { Joi } from 'celebrate';
import * as commonSchema from '../../validations/schema/common.schema';
import { validationMessages } from '../../validations/messages/validation.messages';

export const UserValidation = {
  idValidation: Joi.object().keys({
    id: validationMessages(commonSchema.userIdRule, 'userId'),
  }),

  createUserValidation: Joi.object().keys({
    first_name: validationMessages(commonSchema.firstNameRule, 'name'),
    last_name: validationMessages(commonSchema.lastNameRule, 'name'),
    phone_number: validationMessages(commonSchema.phoneNumberRule, 'phoneNumber'),
    alternate_contact: validationMessages(commonSchema.alternateContactRule, 'alternateContact'),
    role: validationMessages(commonSchema.roleRule, 'role'),
    gender: validationMessages(commonSchema.genderRule, 'gender'),
    date_of_birth: validationMessages(commonSchema.dateOfBirthRule, 'dateOfBirth'),
    status: validationMessages(commonSchema.statusRule, 'status'),
    email: validationMessages(commonSchema.emailRule, 'email'),
  }),

  updateUserValidation: Joi.object({
    first_name: validationMessages(commonSchema.firstNameRule.optional(), 'name'),
    last_name: validationMessages(commonSchema.lastNameRule.optional(), 'name'),
    phone_number: validationMessages(commonSchema.phoneNumberRule.optional(), 'phoneNumber'),
    alternate_contact: validationMessages(
      commonSchema.alternateContactRule.optional(),
      'alternateContact'
    ),
    role: validationMessages(commonSchema.roleRule.optional(), 'role'),
    gender: validationMessages(commonSchema.genderRule.optional(), 'gender'),
    date_of_birth: validationMessages(commonSchema.dateOfBirthRule.optional(), 'dateOfBirth'),
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
