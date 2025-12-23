// src/modules/drivers/driver.service.ts
import { DriverRepository } from './driver.repository';
import { CreateDriverInput, UpdateDriverInput, Driver } from './driver.model';

export const DriverService = {
  async createDriver(driverData: CreateDriverInput): Promise<Driver> {
    // Validate required fields
    if (!driverData.fullName || !driverData.phoneNumber || !driverData.email) {
      throw { statusCode: 400, message: 'Missing required fields' };
    }

    // Create driver
    const driver = await DriverRepository.create(driverData);
    return driver;
  },

  async updateDriver(id: string, driverData: UpdateDriverInput): Promise<Driver> {
    const driver = await DriverRepository.update(id, driverData);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }
    return driver;
  },

  async getDriverById(id: string): Promise<Driver> {
    const driver = await DriverRepository.findById(id);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }
    return driver;
  },

  async getAllDrivers(limit: number = 50, offset: number = 0): Promise<Driver[]> {
    return await DriverRepository.findAll(limit, offset);
  },
};
