// src/modules/drivers/driver.service.ts
import { DriverRepository } from './driver.repository';
import { CreateDriverInput, UpdateDriverInput, Driver } from './driver.model';
import { TripService } from '../trip/trip.service';
import { Server } from 'socket.io';
import { query } from '../../shared/database';
import { Trip } from '../trip/trip.model';
import { logger } from '../../shared/logger';
import { DriverDocumentsRepository } from './driver-documents.repository';

export const DriverService = {
  async createDriver(driverData: CreateDriverInput): Promise<Driver> {
    // Validate required fields
    if (!driverData.full_name || !driverData.phone_number || !driverData.email) {
      throw { statusCode: 400, message: 'Missing required fields' };
    }

    // Create driver
    const driver = await DriverRepository.create(driverData);
    return driver;
  },

  async updateDriver(id: string, driverData: UpdateDriverInput): Promise<Driver> {
    const currentDriver = await DriverRepository.findById(id);
    if (!currentDriver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }

    const currentStatus = currentDriver.onboarding_status;
    let nextStatus: any = driverData.onboarding_status || currentStatus;

    // 1. Profile Completion: PHONE_VERIFIED -> PROFILE_COMPLETED
    if (currentStatus === 'PHONE_VERIFIED' || !currentStatus) {
      const isProfileUpdate = driverData.first_name || driverData.last_name || driverData.email;
      if (isProfileUpdate) {
        const fName = driverData.first_name || currentDriver.first_name;
        const lName = driverData.last_name || currentDriver.last_name;

        if (!driverData.full_name && (driverData.first_name || driverData.last_name)) {
          driverData.full_name = `${fName} ${lName}`.trim();
        }

        if (fName && lName) {
          nextStatus = 'PROFILE_COMPLETED';
        }
      }
    }

    // 2. Address Completion: PROFILE_COMPLETED -> ADDRESS_COMPLETED
    // We allow transition to ADDRESS_COMPLETED if we have address data and are currently at PROFILE_COMPLETED (or lower)
    // or if the payload explicitly requests it.
    if (driverData.address) {
      // Only move forward to ADDRESS_COMPLETED if currently lower
      if (nextStatus === 'PHONE_VERIFIED' || nextStatus === 'PROFILE_COMPLETED' || !nextStatus) {
        nextStatus = 'ADDRESS_COMPLETED';
      }
    }

    // Ensure we don't downgrade if payload explicitly had a higher status
    if (driverData.onboarding_status) {
      // Hierarchy check (very basic)
      const order = ['PHONE_VERIFIED', 'PROFILE_COMPLETED', 'ADDRESS_COMPLETED', 'DOCS_UPLOADING', 'DOCS_SUBMITTED', 'DOCUMENTS_APPROVED', 'ACTIVE'];
      const currentIdx = order.indexOf(nextStatus);
      const requestedIdx = order.indexOf(driverData.onboarding_status as string);
      if (requestedIdx > currentIdx) {
        nextStatus = driverData.onboarding_status;
      }
    }

    driverData.onboarding_status = nextStatus;

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

  async resetDriverProfile(driverId: string): Promise<boolean> {
    try {
      logger.info(`Resetting profile for driver: ${driverId}`);
      // 1. Delete all documents
      await DriverDocumentsRepository.deleteByDriverId(driverId);
      logger.info(`Documents deleted for driver: ${driverId}`);

      // 2. Reset KYC status, Onboarding Status, and Basic metadata
      const defaultKyc = JSON.stringify({ overallStatus: 'pending', verifiedAt: null });
      await query(
        `UPDATE drivers 
         SET status = $1, 
             kyc = $2, 
             onboarding_status = 'PHONE_VERIFIED', 
             documents_submitted = false,
             profile_pic_url = NULL,
             updated_at = NOW() 
         WHERE id = $3`,
        ['pending_verification', defaultKyc, driverId]
      );
      logger.info(`Drivers table updated for driver: ${driverId}`);

      return true;
    } catch (error: any) {
      logger.error(`Error in resetDriverProfile: ${error.message}`);
      throw error;
    }
  },

  async verifyDriverDocuments(driverId: string): Promise<boolean> {
    try {
      logger.info(`Manual verification started for driver: ${driverId}`);

      // 1. Update all documents to verified
      await query(
        `UPDATE driver_documents 
         SET status = 'verified', 
             verified_at = NOW() 
         WHERE driver_id = $1`,
        [driverId]
      );

      // 2. Activate driver account
      const kycData = JSON.stringify({
        overallStatus: 'verified',
        verifiedAt: new Date().toISOString()
      });

      await query(
        `UPDATE drivers 
         SET status = 'active', 
             onboarding_status = 'DOCUMENTS_APPROVED', 
             kyc = $1,
             updated_at = NOW() 
         WHERE id = $2`,
        [kycData, driverId]
      );

      logger.info(`Driver ${driverId} manually verified and activated`);
      return true;
    } catch (error: any) {
      logger.error(`Error in verifyDriverDocuments: ${error.message}`);
      throw error;
    }
  },

  async deleteDriver(id: string): Promise<boolean> {
    const result = await query('DELETE FROM drivers WHERE id = $1', [id]);
    if ((result as any).rowCount === 0) {
      throw { statusCode: 404, message: 'Driver not found' };
    }
    return true;
  },

  /**
   * Update the FCM token for a driver
   */
  async updateFcmToken(driverId: string, fcmToken: string): Promise<void> {
    const driver = await DriverRepository.findById(driverId);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }

    await DriverRepository.updateFcmToken(driverId, fcmToken);
    logger.info(`FCM token updated for driver: ${driverId}`);
  },

  async goOnline(driverId: string): Promise<any> {
    const driver = await DriverRepository.findById(driverId);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }

    // Update status to ONLINE
    await DriverRepository.update(driverId, {
      availability: {
        online: true,
        status: 'ONLINE' as any,
        lastActive: new Date().toISOString(),
      },
    });

    // Check for upcoming scheduled rides
    const upcomingRides = await query(
      `SELECT * FROM trips 
       WHERE driver_id = $1 
       AND booking_type = 'SCHEDULED' 
       AND trip_status = 'ACCEPTED' 
       AND scheduled_start_time > NOW()
       ORDER BY scheduled_start_time ASC`,
      [driverId]
    );

    return {
      success: true,
      upcomingRide: upcomingRides.rows[0] || null,
    };
  },

  async goOffline(driverId: string): Promise<void> {
    const driver = await DriverRepository.findById(driverId);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }

    await DriverRepository.update(driverId, {
      availability: {
        online: false,
        status: 'OFFLINE' as any,
        lastActive: new Date().toISOString(),
      },
    });
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
