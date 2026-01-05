// src/modules/deductions/deduction.validator.ts
import { celebrate, Joi, Segments } from 'celebrate';

export const createDeductionValidator = celebrate({
  [Segments.BODY]: Joi.object().keys({
    driver: Joi.object({
      fullName: Joi.string().required(),
      id: Joi.string().required(),
      phone: Joi.string().required(),
    }).required(),
    amount: Joi.string().required(),
    trip: Joi.string().required(),
    type: Joi.string().required(),
    balanceBefore: Joi.string().optional(),
    balanceAfter: Joi.string().optional(),
    status: Joi.string().optional(),
    reference: Joi.string().optional(),
    performedBy: Joi.string().optional(),
  }),
});

export const getDeductionsValidator = celebrate({
  [Segments.QUERY]: Joi.object().keys({
    search: Joi.string().optional(),
    status: Joi.string().optional(),
    type: Joi.string().optional(),
  }),
});

export const getDeductionByIdValidator = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().required(),
  }),
});
