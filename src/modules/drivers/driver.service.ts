// src/modules/drivers/driver.service.ts
import { DriverRepository } from './driver.repository';
import { CreateDriverInput, UpdateDriverInput, Driver } from './driver.model';
import { DriverDocumentsRepository } from './driver-documents.repository';
import { query } from '../../shared/database';
import { logger } from '../../shared/logger';
import { Server } from 'socket.io';
import { Trip } from '../trip/trip.model';
import { TripService } from '../trip/trip.service';
import axios from 'axios';

export const DriverService = {
  async createDriver(driverData: CreateDriverInput): Promise<Driver> {
    // Validate required fields
    if (!driverData.full_name || !driverData.phone_number || !driverData.email) {
      throw { statusCode: 400, message: 'Missing required fields' };
    }

    // Create driver
    const driver = await DriverRepository.create(driverData);

    // Trigger webhook asynchronously for Admin App real-time notifications
    try {
      const webhookUrl = process.env.ADMIN_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/driver-events';
      axios.post(webhookUrl, {
        eventType: 'NEW_DRIVER',
        message: `A new driver named ${driver.full_name} has registered.`,
        data: driver
      }).catch(err => logger.error(`Webhook trigger failed: ${err.message}`));
    } catch (e) {
      // Ignore 
    }

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
        
        // Trigger webhook for Admin App real-time notifications
        try {
          const webhookUrl = process.env.ADMIN_WEBHOOK_URL || 'http://localhost:3000/api/webhooks/driver-events';
          const driverName = currentDriver.full_name || driverData.full_name || 'A driver';
          axios.post(webhookUrl, {
            eventType: 'DRIVER_PROFILE_COMPLETED',
            message: `Driver ${driverName} completed profile setup.`,
            data: driverData
          }).catch(err => logger.error(`Webhook trigger failed: ${err.message}`));
        } catch (e) {
          // Ignore 
        }
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

    // Close any stale open sessions (safety net for app crashes / missed goOffline)
    await query(
      `UPDATE driver_online_sessions 
       SET went_offline_at = NOW(), 
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - went_online_at)) / 60
       WHERE driver_id = $1 AND went_offline_at IS NULL`,
      [driverId]
    );

    // Create a new online session
    await query(
      `INSERT INTO driver_online_sessions (driver_id, went_online_at) VALUES ($1, NOW())`,
      [driverId]
    );

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

    // Close the open session
    await query(
      `UPDATE driver_online_sessions 
       SET went_offline_at = NOW(), 
           duration_minutes = EXTRACT(EPOCH FROM (NOW() - went_online_at)) / 60
       WHERE driver_id = $1 AND went_offline_at IS NULL`,
      [driverId]
    );

    await DriverRepository.update(driverId, {
      availability: {
        online: false,
        status: 'OFFLINE' as any,
        lastActive: new Date().toISOString(),
      },
    });
  },

  async getTodayOverview(driverId: string): Promise<any> {
    const driver = await DriverRepository.findById(driverId);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }

    // Get today's date boundaries in UTC
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 1. Calculate online minutes today
    // Closed sessions today
    const closedSessions = await query(
      `SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
       FROM driver_online_sessions 
       WHERE driver_id = $1 
         AND went_online_at >= $2 
         AND went_offline_at IS NOT NULL`,
      [driverId, todayStart]
    );
    let totalMinutes = parseFloat(closedSessions.rows[0]?.total_minutes || 0);

    // Ongoing session (if currently online)
    const openSession = await query(
      `SELECT went_online_at 
       FROM driver_online_sessions 
       WHERE driver_id = $1 AND went_offline_at IS NULL 
       ORDER BY went_online_at DESC LIMIT 1`,
      [driverId]
    );
    const currentlyOnline = openSession.rows.length > 0;
    let currentSessionStart: string | null = null;

    if (currentlyOnline) {
      const sessionStart = new Date(openSession.rows[0].went_online_at);
      currentSessionStart = sessionStart.toISOString();
      const ongoingMinutes = (Date.now() - sessionStart.getTime()) / (60 * 1000);
      totalMinutes += ongoingMinutes;
    }

    // 2. Trips completed today
    const tripStats = await query(
      `SELECT 
         COUNT(*) FILTER (WHERE trip_status = 'COMPLETED') as trips_completed,
         COALESCE(SUM(total_fare) FILTER (WHERE trip_status = 'COMPLETED'), 0) as total_earnings
       FROM trips 
       WHERE driver_id = $1 
         AND created_at >= $2 
         AND created_at <= $3`,
      [driverId, todayStart, todayEnd]
    );

    const tripsCompleted = parseInt(tripStats.rows[0]?.trips_completed || 0);
    const totalEarnings = parseFloat(tripStats.rows[0]?.total_earnings || 0);

    // 3. All-time stats for profile header (RIDES & YEARS)
    const allTimeStats = await query(
      `SELECT COUNT(*) as total_completed_rides 
       FROM trips 
       WHERE driver_id = $1 AND trip_status = 'COMPLETED'`,
      [driverId]
    );

    const totalCompletedRides = parseInt(allTimeStats.rows[0]?.total_completed_rides || 0);
    
    // Calculate app usage years
    const createdAt = new Date(driver.created_at || Date.now());
    const diffMs = Date.now() - createdAt.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const yearsActive = parseFloat((diffDays / 365).toFixed(1));

    // Format online time
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    const onlineFormatted = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return {
      onlineMinutes: Math.round(totalMinutes),
      onlineFormatted,
      tripsCompleted,
      totalEarnings,
      totalCompletedRides,
      yearsActive: yearsActive || 0.1, // Default 0.1 for better UX if newly joined
      currentlyOnline,
      currentSessionStart,
    };
  },

  async getOnlineHours(driverId: string): Promise<number> {
    const result = await query(
      `SELECT COALESCE(SUM(duration_minutes), 0) as total_minutes
       FROM driver_online_sessions 
       WHERE driver_id = $1 AND went_offline_at IS NOT NULL`,
      [driverId]
    );
    return Math.round(parseFloat(result.rows[0]?.total_minutes || 0) / 60);
  },
};
