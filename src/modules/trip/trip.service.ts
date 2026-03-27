import { query } from '../../shared/database';
import { Trip } from './trip.model';
import { TripRepository } from './trip.repository';
import { TripChanges } from './tripChanges.model';
import { Server } from 'socket.io';
import {
  BookingType,
  CancelBy,
  CancelReason,
  PaymentStatus,
  RideType,
  ServiceType,
  TripStatus,
} from '../../enums/trip.enums';

export const TripService = {
  async getTrips(bookingType?: string) {
    if (bookingType) {
      return await TripRepository.findActiveRequests(bookingType);
    }
    // Default to active requests for the general driver feed if no type specified
    return await TripRepository.findActiveRequests();
  },

  async getTripById(id: string) {
    const user = await TripRepository.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
  },

  async createTrip(data: Partial<Trip>) {
    // Generate a 4-digit OTP
    data.otp = Math.floor(1000 + Math.random() * 9000).toString();

    const trip = await TripRepository.createTrip(data);
    if (!trip) {
      throw { statusCode: 500, message: 'Trip creation failed' };
    }

    // DISPATCH LOGIC: Notify nearby available drivers
    try {
      if (trip.booking_type === 'LIVE') {
        const { NotificationService } = require('../notifications/notification.service');
        const { UserRepository } = require('../users/user.repository');

        // Find ONLINE drivers who don't have a scheduled ride in < 30 mins
        // For simplicity in this demo, notify all ONLINE drivers
        const onlineDrivers = await query(
          `SELECT id, fcm_token FROM drivers 
           WHERE availability->>'status' = 'ONLINE'
           AND fcm_token IS NOT NULL`
        );
        const passenger = await UserRepository.findById(trip.user_id, 'deleted');

        for (const driver of onlineDrivers.rows) {
          await NotificationService.sendNotification(
            driver.fcm_token,
            'New Ride Request',
            `A passenger requested a ride near you.`,
            {
              type: 'ride_request',
              trip_id: trip.trip_id!,
              pickup_address: trip.pickup_address,
              drop_address: trip.drop_address,
              pickup_lat: trip.pickup_lat.toString(),
              pickup_lng: trip.pickup_lng.toString(),
              drop_lat: trip.drop_lat.toString(),
              drop_lng: trip.drop_lng.toString(),
              total_fare: trip.total_fare?.toString() || '--',
              distance_km: trip.distance_km?.toString() || '--',
              trip_duration_minutes: trip.trip_duration_minutes?.toString() || '--',
              ride_type: trip.ride_type,
              booking_type: trip.booking_type,
              service_type: trip.service_type,
              otp: trip.otp || '',
              passenger: passenger?.full_name || 'Passenger',
              phone: passenger?.phone_number || '',
            }
          );
        }

        // Broadcast to all drivers for real-time UI update on search
        const { emitToAll } = require('../../shared/socket');
        emitToAll('new_trip', { trip });
      }
    } catch (err: any) {
      console.error('Failed to dispatch ride to drivers:', err.message);
    }

    return trip;
  },

  async updateTrip(id: string, data: Partial<Trip>) {
    const fields = Object.keys(data);
    if (fields.length === 0) return null;

    const setQuery = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');

    const values = Object.values(data);
    const trip = await TripRepository.updateTrip(id, setQuery, values);

    if (!trip) {
      throw { statusCode: 500, message: 'Update trip failed' };
    }

    return trip;
  },

  async acceptTrip(tripId: string, driverId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw { statusCode: 404, message: 'Trip not found' };
    }
    if (trip.trip_status !== 'REQUESTED') {
      throw { statusCode: 400, message: 'Trip is no longer available' };
    }

    const { DriverService } = require('../drivers/driver.service');
    const { DriverRepository } = require('../drivers/driver.repository');

    const driver = await DriverRepository.findById(driverId);
    if (!driver) {
      throw { statusCode: 404, message: 'Driver not found' };
    }

    // Conflict Check 1: Must not be already on a trip
    if (driver.availability.status === 'ON_TRIP') {
      throw { statusCode: 400, message: 'You are already on an active trip' };
    }

    const now = new Date();

    if (trip.booking_type === 'SCHEDULED') {
      // Conflict Check 2: Only one scheduled ride at a time
      const existingScheduled = await query(
        "SELECT trip_id FROM trips WHERE driver_id = $1 AND booking_type = 'SCHEDULED' AND trip_status = 'ACCEPTED'",
        [driverId]
      );
      if (existingScheduled.rows.length > 0) {
        throw { statusCode: 400, message: 'You already have an upcoming scheduled ride' };
      }

      // Update Trip
      await this.updateTrip(tripId, {
        trip_status: TripStatus.ACCEPTED,
        driver_id: driverId,
        assigned_at: now,
      });

      // Update Driver
      await DriverRepository.update(driverId, {
        availability: {
          ...driver.availability,
          status: 'HAS_UPCOMING_SCHEDULED',
        },
      });
    } else {
      // LIVE RIDE
      // Conflict Check 3: 30-minute buffer for scheduled rides
      const nearbyScheduled = await query(
        "SELECT trip_id, scheduled_start_time FROM trips WHERE driver_id = $1 AND booking_type = 'SCHEDULED' AND trip_status = 'ACCEPTED' AND (scheduled_start_time - NOW()) < INTERVAL '30 minutes'",
        [driverId]
      );
      if (nearbyScheduled.rows.length > 0) {
        throw { statusCode: 400, message: 'You have a scheduled ride starting soon' };
      }

      // Update Trip
      await this.updateTrip(tripId, {
        trip_status: TripStatus.ACCEPTED,
        driver_id: driverId,
        assigned_at: now,
      });

      // Update Driver
      await DriverRepository.update(driverId, {
        availability: {
          ...driver.availability,
          status: 'ON_TRIP',
        },
      });
    }

    const updatedTrip = await TripRepository.findById(tripId);

    // Broadcast update via Socket.IO
    const { broadcastTripUpdate } = require('../../shared/socket');
    broadcastTripUpdate(tripId, { status: TripStatus.ACCEPTED, trip: updatedTrip });

    return updatedTrip;
  },
  async startTrip(tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) throw { statusCode: 404, message: 'Trip not found' };

    await this.updateTrip(tripId, {
      trip_status: TripStatus.LIVE,
      started_at: new Date(),
    });

    const driverId = trip.driver_id;
    if (driverId) {
      const { DriverRepository } = require('../drivers/driver.repository');
      const driver = await DriverRepository.findById(driverId);
      
      // Enforce ONLINE status to start pickup/trip
      if (driver.availability.status === 'OFFLINE') {
        throw { statusCode: 400, message: 'You must be ONLINE to start this trip.' };
      }

      await DriverRepository.update(driverId, {
        availability: {
          ...driver.availability,
          status: 'ON_TRIP',
        },
      });
    }

    const updatedTrip = await TripRepository.findById(tripId);

    // Broadcast update via Socket.IO
    const { broadcastTripUpdate } = require('../../shared/socket');
    broadcastTripUpdate(tripId, { status: TripStatus.LIVE, trip: updatedTrip });

    return updatedTrip;
  },

  async completeTrip(tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) throw { statusCode: 404, message: 'Trip not found' };

    await this.updateTrip(tripId, {
      trip_status: TripStatus.COMPLETED,
      ended_at: new Date(),
      payment_status: 'PAID' as any, // Simplified
    });

    const driverId = trip.driver_id;
    if (driverId) {
      const { DriverRepository } = require('../drivers/driver.repository');
      const driver = await DriverRepository.findById(driverId);

      // Check if driver has ANY remaining upcoming scheduled rides
      const upcoming = await query(
        "SELECT trip_id FROM trips WHERE driver_id = $1 AND trip_status = 'ACCEPTED' AND booking_type = 'SCHEDULED'",
        [driverId]
      );

      await DriverRepository.update(driverId, {
        availability: {
          ...driver.availability,
          status: upcoming.rows.length > 0 ? 'HAS_UPCOMING_SCHEDULED' : 'ONLINE',
        },
      });
    }

    const updatedTrip = await TripRepository.findById(tripId);

    // Broadcast update via Socket.IO
    const { broadcastTripUpdate } = require('../../shared/socket');
    broadcastTripUpdate(tripId, { status: TripStatus.COMPLETED, trip: updatedTrip });

    return updatedTrip;
  },

  async arrivedTrip(tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) throw { statusCode: 404, message: 'Trip not found' };

    await this.updateTrip(tripId, {
      trip_status: TripStatus.ARRIVED,
    });

    // Notify User
    try {
      const { NotificationService } = require('../notifications/notification.service');
      await NotificationService.sendNotificationToUser(
        trip.user_id,
        'Driver Arrived',
        'Your driver has arrived at the pickup location.',
        {
          type: 'driver_arrived',
          trip_id: tripId,
        }
      );
    } catch (err: any) {
      console.error('Failed to notify user about driver arrival:', err.message);
    }

    const updatedTrip = await TripRepository.findById(tripId);

    // Broadcast update via Socket.IO
    const { broadcastTripUpdate } = require('../../shared/socket');
    broadcastTripUpdate(tripId, { status: TripStatus.ARRIVED, trip: updatedTrip });

    return updatedTrip;
  },

  async cancelTrip(tripId: string, reason?: string, cancelledBy?: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) throw { statusCode: 404, message: 'Trip not found' };

    const isDriver = cancelledBy === 'DRIVER';

    // 🛡️ Production Logic: Driver can only cancel BEFORE Trip is Started (LIVE)
    // UNLESS it's a mid-trip problem (breakdown, emergency)
    const midTripProblemReasons = [
      CancelReason.VEHICLE_PROBLEM,
      CancelReason.PERSONAL_EMERGENCY,
      CancelReason.TECHNICAL_ISSUE,
      CancelReason.OTHER,
    ];

    if (isDriver && trip.trip_status === TripStatus.LIVE && !midTripProblemReasons.includes(reason as CancelReason)) {
      throw { statusCode: 400, message: 'Mid-trip cancellation is only allowed for emergencies or vehicle problems.' };
    }

    const CANCELLATION_REASON_MAP: Record<string, CancelReason> = {
      PERSONAL_EMERGENCY: CancelReason.PERSONAL_EMERGENCY,
      VEHICLE_PROBLEM: CancelReason.VEHICLE_PROBLEM,
      PICKUP_TOO_FAR: CancelReason.PICKUP_TOO_FAR,
      RIDER_NOT_RESPONDING: CancelReason.RIDER_NOT_RESPONDING,
      RIDER_ASKED_TO_CANCEL: CancelReason.RIDER_ASKED_TO_CANCEL,
      TECHNICAL_ISSUE: CancelReason.TECHNICAL_ISSUE,
      OTHER: CancelReason.OTHER,
    };

    const mappedReason =
      CANCELLATION_REASON_MAP[reason as string] ||
      (Object.values(CancelReason).includes(reason as CancelReason) ? (reason as CancelReason) : CancelReason.OTHER);

    const newStatus = trip.trip_status === TripStatus.LIVE ? TripStatus.MID_CANCELLED : TripStatus.CANCELLED;

    await this.updateTrip(tripId, {
      trip_status: newStatus,
      cancel_reason: mappedReason,
      cancel_by: cancelledBy as any,
    });

    const driverId = trip.driver_id;
    if (driverId) {
      const { DriverRepository } = require('../drivers/driver.repository');
      const driver = await DriverRepository.findById(driverId);
      await DriverRepository.update(driverId, {
        availability: {
          ...driver.availability,
          status: 'ONLINE', // Reset to ONLINE
        },
      });
    }

    // Notify User
    try {
      const { NotificationService } = require('../notifications/notification.service');
      await NotificationService.sendNotificationToUser(
        trip.user_id,
        'Trip Cancelled',
        `Your trip has been cancelled by the ${cancelledBy || 'driver'}.`,
        {
          type: 'trip_cancelled',
          trip_id: tripId,
        }
      );
    } catch (err: any) {
      console.error('Failed to notify user about trip cancellation:', err.message);
    }

    const updatedTrip = await TripRepository.findById(tripId);

    // Broadcast update via Socket.IO
    const { broadcastTripUpdate } = require('../../shared/socket');
    broadcastTripUpdate(tripId, { status: newStatus, trip: updatedTrip });

    return updatedTrip;
  },

  async createTripChanges(data: TripChanges) {
    const tripChanges = await TripRepository.createTripChanges(data);
    if (!tripChanges) {
      throw { statusCode: 400, message: 'Trip Changes not created' };
    }
    return tripChanges;
  },
  async requestRideToMultipleDrivers(io: Server, tripData: any, drivers: any[]) {
    const tripId = tripData[0].trip_id;
    const broadcast = () => {
      console.log(`📡 Broadcasting Trip ${tripId} to ${drivers.length} drivers`);
      drivers.forEach((driver) => {
        const driverRoom = `driver_${driver.id}`;
        io.to(driverRoom).emit('NEW_TRIP_REQUEST', {
          trip_id: tripId,
          pickup: tripData[0].pickup_address,
          drop: tripData[0].drop_address,
          total_fare: tripData[0].total_fare,
          passengerName: tripData[0].passenger_details?.name || 'Passenger',
          distanceToUser: driver.distance_meters,
          remaining: 15,
        });
      });
    };
    broadcast();
  },
  
  async getActiveTrip(driverId: string) {
    return await TripRepository.findActiveByDriverId(driverId);
  },
};
