import { Server } from 'socket.io';
import { Trip } from './trip.model';
import { TripRepository } from './trip.repository';
import { TripChanges } from './tripChanges.model';
import { query } from '../../shared/database';
import { notificationService, PushPayload } from '../../services/notificationService';
import { UserRepository } from '../users/user.repository';


export const TripService = {
  async getTrips() {
    return await TripRepository.findAll();
  },
  async getAllTripsWithChanges() {
    return await TripRepository.getAllTripsWithChanges();
  },

  async getTripByUserId(id: string, role: string) {
    const user = await TripRepository.findByUserId(id, role);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
  },

  async getTripById(id: string) {
    const trip = await TripRepository.findById(id);
    if (!trip) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return trip;
  },
  async createTrip(data: Partial<Trip>) {
    const user = await TripRepository.createTrip(data);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
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

  async createTripChanges(data: TripChanges) {
    const tripChanges = await TripRepository.createTripChanges(data);
    if (!tripChanges) {
      throw { statusCode: 400, message: 'Trip Changes not created' };
    }
    return tripChanges;
  },

  async getActiveTripByUserId(id: string) {
    const trips = await TripRepository.findActiveTripByUserId(id);
    if (!trips) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return {
      activeTrips: trips.activeTrips,
      scheduledTrips: trips.scheduledTrips
    };
  },


  async requestRide(io: Server, tripData: any, driverId: string) {
    // Find driver's private room
    const driverRoom = `driver_${driverId}`;

    // Notify Driver
    io.to(driverRoom).emit('NEW_TRIP_REQUEST', {
      tripId: tripData.id,
      pickup: tripData.pickup_address,
      drop: tripData.drop_address,
      fare: tripData.fare,
      passengerName: tripData.user_name
    });
  },

  async acceptTrip(io: Server, tripId: string, driverId: string) {
    try {
      // 1. Database Transaction via Repository
      const trip = await TripRepository.acceptTrip(tripId, driverId);
      console.log(trip, "trip")
      if (!trip) {
        throw new Error("Trip not found or already accepted by another driver.");
      }

      // 2. Fetch Driver info for a better User Experience
      const driverInfo = await TripRepository.getDriverDetails(driverId);

      // 3. Notify the User via Socket
      io.to(`trip_${tripId}`).emit('TRIP_ACCEPTED', {
        status: 'ACCEPTED',
        rideId: tripId,
        driverName: driverInfo?.full_name || "Captain",
        driverProfilePic: 'https://i.pravatar.cc/300?u=user123',
        driverPhone: '9998887786',
        driverRating: 4.5,
        driverOTP: '5432',
        vehicle: `${driverInfo?.vehicle_model} - ${driverInfo?.plate_number}`,
        current_lat: driverInfo.current_lat,
        current_lng: driverInfo.current_lng,
        heading: driverInfo.current_heading || 0
      });

      console.log(`🗑️ Broadcating TRIP_REMOVED for trip: ${tripId}`);
      io.emit('TRIP_REMOVED', { tripId });
      const customerToken = await UserRepository.getFcmTokenById(trip.user_id);
      if (!customerToken) {
        console.warn(`Cannot send notification: User ${trip.user_id} has no FCM token.`);
        return;
      }
      await notificationService.sendPushNotification(customerToken, {
        title: "Driver Assigned! 🚗",
        body: "Your VDrive driver is on the way to pick you up.",
        data: {
          "type": "TRIP_DETAILS",
          "tripId": String(trip.trip_id ?? ""),
          "status": "ASSIGNED"
        }
      })

      return trip;
    } catch (error) {
      console.error("Acceptance Error in Service:", error);
      throw error;
    }
  },


  async requestRideToMultipleDrivers(io: Server, tripData: any, drivers: any[]) {
    const tripId = tripData[0].trip_id;
    const RETRY_INTERVAL = 20000; // 20 seconds (gives driver 15s to react + 5s gap)

    const broadcast = () => {
      console.log(`📡 Broadcasting Trip ${tripId} to ${drivers.length} drivers`);
      drivers.forEach(driver => {
        const driverRoom = `driver_${driver.id}`;
        io.to(driverRoom).emit('NEW_TRIP_REQUEST', {
          tripId: tripId,
          pickup: tripData[0].pickup_address,
          drop: tripData[0].drop_address,
          fare: tripData[0].total_fare,
          passengerName: tripData[0].passenger_details?.name || "Passenger",
          distanceToUser: driver.distance_meters,
          remaining: 15 // Reset the UI timer to 15s for the driver
        });
      });
    };

    // Initial broadcast
    broadcast();

    // Repeat every 20 seconds
    const timer = setInterval(async () => {
      try {
        // 1. Query the database
        const sql = 'SELECT trip_status FROM trips WHERE trip_id = $1 LIMIT 1';
        const result = await query(sql, [tripId]);
        const currentTrip = result.rows[0];

        // 2. Status Validation
        const status = currentTrip?.trip_status;

        // Stop if trip is gone, or status is no longer 'pending' / 'searching'
        if (!currentTrip || status !== 'REQUESTED') {
          console.log(`🛑 Stopping broadcast for Trip ${tripId}. Current Status: ${status || 'DELETED'}`);
          clearInterval(timer);
          return;
        }

        // 3. Re-broadcast
        console.log(`🔄 Trip ${tripId} is still pending. Re-sending to drivers...`);
        broadcast();

      } catch (error) {
        // Important: Don't stop the loop on a temporary network flicker, 
        // but log the error so you can see if the DB goes down.
        console.error("Postgres Error in broadcast loop:", error);
      }
    }, RETRY_INTERVAL);

    return { success: true };
  },

  async updateTripStatus(io: Server, tripId: string, tripStatus: string) {
    const trip = await TripRepository.updateTripStatus(tripId, tripStatus)
    if (!trip) {
      throw new Error("Trip not found");
    }
    io.to(`trip_${tripId}`).emit('tripStatusChanged', {
      status: trip.trip_status,
    });
    return trip;
  }
};
