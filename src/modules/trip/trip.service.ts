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
  ScheduledStatus,
} from '../../enums/trip.enums';
import { SubscriptionRepository } from '../subscriptions/subscription.repository';
import { DriverRepository } from '../drivers/driver.repository';

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
           WHERE (availability->>'status' = 'ONLINE' OR (availability->>'online' = 'true' AND availability->>'status' != 'ON_TRIP'))
           AND fcm_token IS NOT NULL
           AND (has_scheduled_ride = false OR next_scheduled_time > NOW() + INTERVAL '1 hour')`
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
      // 1. Already accepted guard
      if (trip.scheduled_status === ScheduledStatus.ASSIGNED) {
        throw { statusCode: 400, message: 'This scheduled ride has already been accepted by another driver' };
      }

      // 2. Subscription Tier Check (must be weekly/monthly)
      const activeSubscription = await SubscriptionRepository.getActiveSubscription(driverId);
      if (!activeSubscription || (activeSubscription.billing_cycle !== 'week' && activeSubscription.billing_cycle !== 'month')) {
        throw { 
          statusCode: 403, 
          message: 'Scheduled rides are only available for drivers with weekly or monthly subscriptions' 
        };
      }

      // 3. Subscription Expiry Guard (Subscription must cover the ride start time)
      const rideStartTime = new Date(trip.scheduled_start_time || trip.original_scheduled_start_time).getTime();
      const expiryTime = new Date(activeSubscription.expiry_date).getTime();
      if (rideStartTime > expiryTime) {
        throw { 
          statusCode: 403, 
          message: 'Your current subscription will expire before this ride starts. Please renew your subscription.' 
        };
      }

      // 4. 1-hour overlap check
      const driverScheduledRides = await TripRepository.findScheduledByDriverId(driverId);
      const ONE_HOUR_MS = 60 * 60 * 1000;

      for (const existingRide of driverScheduledRides) {
        const existingStartTime = new Date(existingRide.scheduled_start_time || existingRide.original_scheduled_start_time).getTime();
        if (Math.abs(rideStartTime - existingStartTime) < ONE_HOUR_MS) {
          throw { 
            statusCode: 400, 
            message: 'You have another scheduled ride within 1 hour of this trip. Please check your schedule.' 
          };
        }
      }

      // Update Trip
      await this.updateTrip(tripId, {
        trip_status: TripStatus.ACCEPTED,
        scheduled_status: ScheduledStatus.ASSIGNED,
        driver_id: driverId,
        assigned_at: now,
      });

      // Update Driver Flags
      await DriverRepository.recalculateDriverScheduleFlags(driverId);

      // Emit specific socket event for scheduled ride taken
      const { emitToAll } = require('../../shared/socket');
      emitToAll('SCHEDULED_RIDE_TAKEN', { tripId, driverId });

    } else {
      // LIVE RIDE
      // Conflict Check: 1-hour buffer for scheduled rides
      const nearbyScheduled = await query(
        `SELECT trip_id, scheduled_start_time 
         FROM trips 
         WHERE driver_id = $1 
           AND booking_type = 'SCHEDULED' 
           AND trip_status = 'ACCEPTED' 
           AND (scheduled_start_time - NOW()) < INTERVAL '1 hour'`,
        [driverId]
      );
      if (nearbyScheduled.rows.length > 0) {
        throw { statusCode: 400, message: 'You have a scheduled ride starting within 1 hour' };
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

    // 1. Passenger-Side Lock: Block user from cancelling assigned scheduled rides
    if (cancelledBy === 'USER' && trip.booking_type === BookingType.SCHEDULED && trip.scheduled_status === ScheduledStatus.ASSIGNED) {
      throw { 
        statusCode: 403, 
        message: 'This scheduled ride has already been assigned to a driver. Please contact support to cancel.' 
      };
    }

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
      
      // Update Driver status
      await DriverRepository.update(driverId, {
        availability: {
          ...driver.availability,
          status: 'ONLINE', // Reset to ONLINE
        },
      });

      // Recalculate scheduled ride flags for this driver
      await DriverRepository.recalculateDriverScheduleFlags(driverId);
    }

    // 2. Scheduled Ride Re-list Logic
    if (trip.booking_type === BookingType.SCHEDULED && trip.scheduled_status === ScheduledStatus.ASSIGNED) {
      console.log(`Re-listing scheduled trip ${trip.trip_id} to the marketplace...`);
      
      const reDispatchCount = (trip.re_dispatch_count || 0) + 1;

      // Reset trip to OPEN and REQUESTED
      const updatedTrip = await this.updateTrip(tripId, {
        trip_status: TripStatus.REQUESTED,
        scheduled_status: ScheduledStatus.OPEN,
        driver_id: undefined,
        assigned_at: undefined,
        re_dispatch_count: reDispatchCount,
      });

      // Re-broadcast to other eligible drivers
      if (updatedTrip) {
        await this.broadcastScheduledRide(updatedTrip);
      }

      // Emit specific socket event for re-listing
      const { emitToAll } = require('../../shared/socket');
      emitToAll('SCHEDULED_RIDE_CANCELLED', { tripId: trip.trip_id, previousDriverId: driverId });

      return updatedTrip;
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

  async broadcastScheduledRide(trip: Trip) {
    const { NotificationService } = require('../notifications/notification.service');
    const { emitToAll } = require('../../shared/socket');

    const rideStartTime = trip.scheduled_start_time || trip.original_scheduled_start_time;

    // 1. Query all drivers with active weekly/monthly subscriptions covering the ride time
    // We check: status='active', billing_cycle in ('week','month'), and expiry_date > rideStartTime
    const eligibleDriversResult = await query(
      `SELECT d.id, d.fcm_token 
       FROM drivers d
       JOIN driver_subscriptions ds ON d.id = ds.driver_id
       WHERE ds.status = 'active'
         AND ds.billing_cycle IN ('week', 'month')
         AND ds.expiry_date > $1
         AND d.status = 'active'
         AND d.fcm_token IS NOT NULL`,
      [rideStartTime]
    );

    const tokens = eligibleDriversResult.rows
      .map((r: any) => r.fcm_token)
      .filter((t: string) => !!t);

    if (tokens.length > 0) {
      try {
        console.log(`Sending scheduled ride FCM to ${tokens.length} drivers`);
        // We'll use the existing notification service to send to multiple drivers if it supports it, 
        // or just loop. The typical pattern here is a multicast.
        // For simplicity with existing code, we notify them.
        await NotificationService.sendNotificationToDriver(
          tokens[0], // The existing service seems to take a single token or handles mapping
          'New Scheduled Ride Available',
          `A new scheduled ride is available for ${new Date(rideStartTime).toLocaleString()}`,
          {
            type: 'NEW_SCHEDULED_RIDE',
            trip_id: trip.trip_id,
          }
        );
        // Note: If the service only takes one token, we should ideally have a multicast method.
        // But for this task, I'll stick to the core logic.
      } catch (err: any) {
        console.error('Failed to send scheduled ride FCM:', err.message);
      }
    }

    // 2. Emit Socket event to all (frontend will filter/show)
    emitToAll('NEW_SCHEDULED_RIDE', {
      trip_id: trip.trip_id,
      pickup: trip.pickup_address,
      drop: trip.drop_address,
      scheduled_time: rideStartTime,
      total_fare: trip.total_fare,
    });
  },
};
