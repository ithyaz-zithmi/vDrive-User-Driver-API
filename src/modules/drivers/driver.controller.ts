import { DriverStatus, Address, CreateDriverInput } from './driver.model';
// src/modules/drivers/driver.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DriverService } from './driver.service';
import { successResponse } from '../../shared/errorHandler';
import { Driver } from './driver.model';
import { formFullName } from '../../utilities/helper';
import { UserStatus } from '../../enums/user.enums';

export const DriverController = {
  async addDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const body: CreateDriverInput = {
        first_name: req.body.first_name ?? '',
        last_name: req.body.last_name ?? '',
        full_name: formFullName(req.body.first_name, req.body.last_name) || '',
        phone_number: req.body.phone_number ?? '',
        alternate_contact: req.body.alternate_contact || '',
        date_of_birth: req.body.date_of_birth || null,
        role: req.body.role,
        status: req.body.status || UserStatus.ACTIVE,
        gender: req.body.gender || '',
        email: req.body.email || '',
        device_id: req.body.device_id || '',
        address: req.body.address || '',
      };
      const driver = await DriverService.createDriver(body);
      return successResponse(res, 201, 'Driver created successfully', driver);
    } catch (err) {
      next(err);
    }
  },

  async updateDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const driver = await DriverService.updateDriver(req.params.id, req.body);
      return successResponse(res, 200, 'Driver updated successfully', driver);
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
