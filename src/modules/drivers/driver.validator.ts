// src/modules/drivers/driver.validator.ts
import { celebrate, Joi, Segments } from 'celebrate';

const addressSchema = Joi.object({
  street: Joi.string().required(),
  city: Joi.string().required(),
  state: Joi.string().required(),
  country: Joi.string().required(),
  pincode: Joi.string().required(),
});

const vehicleSchema = Joi.object({
  vehicleNumber: Joi.string().required(),
  vehicleModel: Joi.string().required(),
  vehicleType: Joi.string().required(),
  fuelType: Joi.string().required(),
  registrationDate: Joi.string().isoDate().required(),
  insuranceExpiry: Joi.string().isoDate().required(),
  rcDocumentUrl: Joi.string().uri().optional(),
  status: Joi.boolean().optional(),
});

const updateVehicleSchema = Joi.object({
  vehicleId: Joi.string().optional(),
  vehicleNumber: Joi.string().optional(),
  vehicleModel: Joi.string().optional(),
  vehicleType: Joi.string().optional(),
  fuelType: Joi.string().optional(),
  registrationDate: Joi.string().isoDate().allow(null, '').optional(),
  insuranceExpiry: Joi.string().isoDate().allow(null, '').optional(),
  rcDocumentUrl: Joi.string().uri().optional(),
  status: Joi.boolean().optional(),
});

const documentSchema = Joi.object({
  documentType: Joi.string().required(),
  documentNumber: Joi.string().required(),
  documentUrl: Joi.string().uri().required(),
  licenseStatus: Joi.string().optional(),
  expiryDate: Joi.string().isoDate().optional(),
});

const updateDocumentSchema = Joi.object({
  documentId: Joi.string().optional(),
  documentType: Joi.string().optional(),
  documentNumber: Joi.string().optional(),
  documentUrl: Joi.string().uri().optional(),
  licenseStatus: Joi.string().allow(null, '').optional(),
  expiryDate: Joi.string().isoDate().allow(null, '').optional(),
});

export const createDriverValidator = celebrate({
  [Segments.BODY]: Joi.object().keys({
    fullName: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    email: Joi.string().email().required(),
    profilePicUrl: Joi.string().uri().optional(),
    dob: Joi.string().isoDate().required(),
    gender: Joi.string().valid('male', 'female', 'other').required(),
    address: addressSchema.required(),
    role: Joi.string().required(),
    status: Joi.string().required(),
    vehicle: vehicleSchema.unknown(true).optional(),
    documents: Joi.array().items(documentSchema.unknown(true)).optional(),
  }).unknown(true),
});

export const getDriverValidator = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().uuid().required(),
  }),
});

export const getDriversValidator = celebrate({
  [Segments.QUERY]: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
  }),
});

export const updateDriverValidator = celebrate({
  [Segments.PARAMS]: Joi.object().keys({
    id: Joi.string().uuid().required(),
  }),
  [Segments.BODY]: Joi.object().keys({
    driverId: Joi.string().optional(),
    fullName: Joi.string().optional(),
    phoneNumber: Joi.string().optional(),
    email: Joi.string().email().optional(),
    profilePicUrl: Joi.string().uri().optional(),
    dob: Joi.string().isoDate().optional(),
    gender: Joi.string().valid('male', 'female', 'other').optional(),
    address: addressSchema.optional(),
    role: Joi.string().optional(),
    status: Joi.string().optional(),
    vehicle: updateVehicleSchema.unknown(true).optional(),
    documents: Joi.array().items(updateDocumentSchema.unknown(true)).optional(),
  }).unknown(true),
});
