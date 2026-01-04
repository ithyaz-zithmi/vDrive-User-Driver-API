import { Joi } from 'celebrate';
import * as commonSchema from '../../validations/schema/common.schema';

export const RechargePlanValidation = {

  idValidation: Joi.object().keys({
  id: Joi.number().integer().positive().required()
}),


  createValidation: Joi.object().keys({
    planName: Joi.string().min(2).max(100).required(),
    description: Joi.string().allow('', null),
    rideLimit: Joi.number().integer().min(1).required(),
    validityDays: Joi.number().integer().min(1).required(),
    price: Joi.number().precision(2).required(),
    isActive: Joi.boolean().default(true),
  }),

  updateValidation: Joi.object({
    planName: Joi.string().min(2).max(100),
    description: Joi.string().allow('', null),
    rideLimit: Joi.number().integer().min(1),
    validityDays: Joi.number().integer().min(1),
    price: Joi.number().precision(2),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update recharge plan',
    }),

  statusValidation: Joi.object({
    isActive: Joi.boolean().required(),
  }),
};
