// src/modules/drivers/driver.controller.ts
import { Request, Response, NextFunction } from 'express';
import { DriverService } from './driver.service';
import { successResponse } from '../../shared/errorHandler';
import { Server } from 'socket.io';

export const DriverController = {
  async addDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const driverData = {
        ...req.body,
        createdBy: (req as any).adminId,
      };
      const driver = await DriverService.createDriver(driverData);
      return successResponse(res, 201, 'Driver created successfully', driver);
    } catch (err) {
      next(err);
    }
  },

  async updateDriver(req: Request, res: Response, next: NextFunction) {
    try {
      const driverData = {
        ...req.body,
        updatedBy: (req as any).adminId,
      };
      const driver = await DriverService.updateDriver(req.params.id, driverData);
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

  async findNearbyDrivers(req: Request, res: Response) {
    try {
      const io = req.app.get('io');
      const { lng, lat, newTrip } = req.body;
      const drivers = await DriverService.findNearbyDrivers(
        io,
        Number(lng),
        Number(lat),
        newTrip
      );

      return res.status(200).json({ success: true, data: drivers });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateLocation(req: Request, res: Response) {
    try {
      const { driverId, lat, lng, address } = req.body;
      await DriverService.syncLocation(driverId, lat, lng, address);
      return res.status(200).json({ success: true, message: "Location updated" });
    } catch (error: any) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
};
