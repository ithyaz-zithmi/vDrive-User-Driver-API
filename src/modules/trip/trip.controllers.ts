import { Request, Response, NextFunction } from 'express';
import { TripService } from './trip.service';
import { successResponse } from '../../shared/errorHandler';
import { Trip } from './trip.model';
import { logger } from '../../shared/logger';
import { cleanUndefined } from '../../utilities/helper';
import { notifyAdmin } from '../../sockets/admin-socket.service';
import { DriverNotifications, UserNotifications } from '../notifications';
import { UserRepository } from '../users/user.repository';
import { CancelBy, TripStatus } from '../../enums/trip.enums';
import { DriverRepository } from '../drivers/driver.repository';


export const TripController = {
  //user-driver
  async getTrips(req: Request, res: Response, next: NextFunction) {
    try {
      const trips = await TripService.getTrips();
      if (!trips) {
        throw { statusCode: 204, message: 'Trip data are Empty' };
      }
      return successResponse(res, 200, 'Trips fetched successfully', trips);
    } catch (err: any) {
      logger.error(`getTrips error: ${err.message}`);
      next(err);
    }
  },

  async getTripById(req: Request, res: Response, next: NextFunction) {
    try {
      const trip = await TripService.getTripById(req?.params?.id);
      return successResponse(res, 200, 'Trip fetched successfully', trip);
    } catch (err: any) {
      logger.error(`getTripById error: ${err.message}`);
      next(err);
    }
  },

  async getTripByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req?.params?.id;
      const { role } = req.body;
      const trip = await TripService.getTripByUserId(id, role);
      return successResponse(res, 200, 'Trip fetched successfully', trip);
    } catch (err: any) {
      logger.error(`getTripById error: ${err.message}`);
      next(err);
    }
  },

  async createTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const tripData = {
        ...req.body,
        created_by: (req as any).adminId,
      };
      const trip = await TripService.createTrip(tripData);
      notifyAdmin('NEW_TRIP', {
        id: trip.trip_id,
        userId: trip.user_id,
        pickupLocation: trip.pickup_address,
        dropoffLocation: trip.drop_address,
        status: trip.trip_status,
        createdAt: trip.created_at,
      });
      const userfcmtoken = await UserRepository.getFcmTokenById(trip.user_id);
      if (userfcmtoken && trip.trip_id) {
        await UserNotifications.bookingConfirmed(userfcmtoken, trip.trip_id);
      }
      return successResponse(res, 201, 'Trip created successfully', trip);
    } catch (err: any) {
      logger.error(`createTrip error: ${err.message}`);
      next(err);
    }
  },

  async updateTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const updateTripData: Partial<Trip> = {
        driver_id: req.body.driver_id,
        ride_type: req.body?.ride_type,
        vehicle_id: req.body.vehicle_id,
        trip_status: req.body.trip_status,
        scheduled_start_time: req.body?.scheduled_start_time,
        pickup_address: req.body?.pickup_address,
        drop_address: req.body?.drop_address,
        actual_pickup_time: req.body.actual_pickup_time,
        actual_drop_time: req.body.actual_drop_time,
        trip_duration_minutes: req.body.trip_duration_minutes,
        waiting_time_minutes: req.body.waiting_time_minutes,
        waiting_charges: req.body.waiting_charges,
        driver_allowance: req.body.driver_allowance,
        total_fare: req.body.total_fare,
        paid_amount: req.body.paid_amount,
        payment_status: req.body.payment_status,
        cancel_reason: req.body.cancel_reason,
        cancel_by: req.body.cancel_by,
        notes: req.body.notes,
        rating: req.body.rating,
        feedback: req.body.feedback,
        re_route_id: req.body.re_route_id,
        updated_by: (req as any).adminId,
      };

      const updateData = cleanUndefined(updateTripData);

      if (!Object.keys(updateData).length) {
        throw { statusCode: 400, message: 'At least one field must be provided to update' };
      }

      const updatedTrip = await TripService.updateTrip(id, updateData);

      if (!updatedTrip) {
        throw { statusCode: 400, message: 'Trip not found' };
      }

      return successResponse(res, 200, 'Trip updated successfully', updatedTrip);
    } catch (err: any) {
      logger.error(`updateTrip error: ${err.message}`);
      next(err);
    }
  },



  async getActiveTripByUserId(req: Request, res: Response, next: NextFunction) {
    try {
      const trip = await TripService.getActiveTripByUserId(req?.params?.id);
      return successResponse(res, 200, 'Trip fetched successfully', trip);
    } catch (err: any) {
      logger.error(`getTripById error: ${err.message}`);
      next(err);
    }
  },


  async acceptTripController(req: Request, res: Response) {
    const { tripId, driverId } = req.body;
    const io = req.app.get('io');

    try {
      const trip = await TripService.acceptTrip(tripId, driverId);

      return res.status(200).json({
        success: true,
        message: "Trip accepted successfully",
        trip
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Could not accept trip" });
    }
  },

  async cancelTrip(req: Request, res: Response) {
    const { id } = req.params;
    const { trip_status, cancel_reason, cancel_by, notes } = req.body;
    const io = req.app.get('io');

    try {
      const trip = await TripService.cancelTrip(id, trip_status, cancel_reason, cancel_by, notes);
      const userfcmtoken = trip.user_id
        ? await UserRepository.getFcmTokenById(trip.user_id)
        : null;

      const driverfcmtoken = trip.driver_id
        ? await DriverRepository.getFcmTokenById(trip.driver_id)
        : null;

      if (cancel_by === CancelBy.USER) {
        if (userfcmtoken && trip.trip_id) {
          await UserNotifications.bookingCancelled(userfcmtoken, trip.trip_id, notes || '');
        }
        // ✅ guard driverfcmtoken before passing
        if (driverfcmtoken && trip.trip_id) {
          await DriverNotifications.rideCancelled(driverfcmtoken, trip.trip_id);
        }

      } else if (cancel_by === CancelBy.DRIVER) {
        if (driverfcmtoken && trip.trip_id) {
          await DriverNotifications.bookingCancelled(driverfcmtoken, trip.trip_id, notes || '');
        }
        // ✅ guard userfcmtoken before passing
        if (userfcmtoken && trip.trip_id) {
          await UserNotifications.rideCancelled(userfcmtoken, trip.trip_id);
        }
      }

      return res.status(200).json({
        success: true,
        message: "Trip cancelled successfully",
        data: trip
      });

    } catch (error) {
      return res.status(500).json({ success: false, message: "Could not cancel trip" });
    }
  },


  async acceptTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const driverId = req.body.driver_id || (req as any).user?.id;
      if (!driverId) throw { statusCode: 400, message: 'driver_id is required' };

      const trip = await TripService.acceptTrip(id as string, driverId);
      return successResponse(res, 200, 'Trip accepted successfully', trip);
    } catch (err: any) {
      logger.error(`acceptTrip error: ${err.message}`);
      next(err);
    }
  },

  async startTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trip = await TripService.startTrip(id as string);
      return successResponse(res, 200, 'Trip started successfully', trip);
    } catch (err: any) {
      logger.error(`startTrip error: ${err.message}`);
      next(err);
    }
  },

  async completeTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trip = await TripService.completeTrip(id as string);
      return successResponse(res, 200, 'Trip completed successfully', trip);
    } catch (err: any) {
      logger.error(`completeTrip error: ${err.message}`);
      next(err);
    }
  },

  async arrivedTrip(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const trip = await TripService.arrivedTrip(id as string);
      return successResponse(res, 200, 'Driver arrived at pickup successfully', trip);
    } catch (err: any) {
      logger.error(`arrivedTrip error: ${err.message}`);
      next(err);
    }
  },

  //Admin
  async getAllTripsWithChanges(req: Request, res: Response, next: NextFunction) {
    try {
      const trips = await TripService.getAllTripsWithChanges();
      // console.log(trips, "trips");
      if (!trips) {
        throw { statusCode: 204, message: 'Trip data are Empty' };
      }
      return successResponse(res, 200, 'Trips fetched successfully', trips);
    } catch (err: any) {
      logger.error(`getTrips error: ${err.message}`);
      next(err);
    }
  },

  //TripChanges
  async createTripChanges(req: Request, res: Response, next: NextFunction) {
    try {
      const tripChanges = await TripService.createTripChanges(req.body);
      return successResponse(res, 201, 'Trip Changes created successfully', tripChanges);
    } catch (err: any) {
      logger.error(`createTripChanges error: ${err.message}`);
      next(err);
    }
  },

  async updateTripStatusController(req: Request, res: Response) {
    const { trip_id, trip_status } = req.body;
    const io = req.app.get('io');

    try {
      const trip = await TripService.updateTripStatus(io, trip_id, trip_status);
      // Notify admin backend of the status update
      // notifyAdmin(trip_id, trip_status);

      return res.status(200).json({
        success: true,
        message: "Trip status updated successfully",
        trip
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Could not update trip" });
    }
  },


};
