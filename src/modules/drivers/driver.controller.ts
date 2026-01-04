// src/modules/drivers/driver.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DriverService } from './driver.service';
import { DriverDocumentsService } from './driver-documents.service';
import { successResponse } from '../../shared/errorHandler';

export const DriverController = {
  async addDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const { documents, ...driverData } = req.body;
      const driver = await DriverService.createDriver(driverData);

      if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
          await DriverDocumentsService.uploadDocument(driver.driverId, doc.documentType, {
            document_url: doc.documentUrl,
            metadata: {
              document_number: doc.documentNumber,
              license_status: doc.licenseStatus,
              expiry_date: doc.expiryDate,
            }
          });
        }
      }

      const updatedDriver = await DriverService.getDriverById(driver.driverId);
      return successResponse(res, 201, 'Driver created successfully', updatedDriver);
    } catch (err) {
      next(err);
    }
  },

  async updateDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const { documents, ...driverData } = req.body;
      const driver = await DriverService.updateDriver(req.params.id, driverData);

      if (documents && Array.isArray(documents)) {
        for (const doc of documents) {
          await DriverDocumentsService.uploadDocument(req.params.id, doc.documentType, {
            document_url: doc.documentUrl,
            metadata: {
              document_number: doc.documentNumber,
              license_status: doc.licenseStatus,
              expiry_date: doc.expiryDate,
            }
          });
        }
      }

      const updatedDriver = await DriverService.getDriverById(req.params.id);
      return successResponse(res, 200, 'Driver updated successfully', updatedDriver);
    } catch (err) {
      next(err);
    }
  },

  async getDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await DriverService.getDriverById(req.params.id);
      return successResponse(res, 200, 'Driver fetched successfully', driver);
    } catch (err) {
      next(err);
    }
  },

  async getDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const drivers = await DriverService.getAllDrivers(limit, offset);
      return successResponse(res, 200, 'Drivers fetched successfully', drivers);
    } catch (err) {
      next(err);
    }
  },
};
