// src/modules/drivers/driver.service.ts
import { DriverRepository } from './driver.repository';
import { CreateDriverInput, UpdateDriverInput, Driver } from './driver.model';
import { TripService } from '../trip/trip.service';
import { Server } from 'socket.io';
import { Trip } from '../trip/trip.model';

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
    // const driver = await DriverRepository.findById(id);
    const driver = await DriverRepository.getDriverbyID(id);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }
    return driver;
  },

  async getAllDrivers(limit: number = 50, offset: number = 0): Promise<Driver[]> {
    return await DriverRepository.findAll(limit, offset);
  },

  async findNearbyDrivers(io: Server, lng: number, lat: number, newTrip: Trip) {
    // Business Rule: We only show drivers active in the last 10 mins
    const { drivers, searchedRadius } = await DriverRepository.findNearbyDriversExpanding(lng, lat);

    if (!drivers || drivers.length === 0) {
      throw new Error("No drivers found in your area.");
    }

    if (drivers && drivers.length > 0) {
      await TripService.requestRideToMultipleDrivers(io, newTrip, drivers);
    }

    return { drivers, searchedRadius };
  },

  async syncLocation(id: string, lat: number, lng: number, address: string) {
    // Validation: Coordinates must be within Earth's range
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Invalid coordinates provided.");
    }
    return await DriverRepository.updateLocation(id, lat, lng, address);
  }
};
