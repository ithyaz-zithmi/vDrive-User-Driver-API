import { Request, Response, NextFunction } from 'express';
import { TripService } from './trip.service';
import { successResponse } from '../../shared/errorHandler';
import { Trip } from './trip.model';
import { logger } from '../../shared/logger';
import { cleanUndefined } from '../../utilities/helper';
import { notifyAdminOfNewTrip } from '../../services/admin-socket.service';

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
      notifyAdminOfNewTrip(trip);
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
      const trip = await TripService.acceptTrip(io, tripId, driverId);

      return res.status(200).json({
        success: true,
        message: "Trip accepted successfully",
        trip
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Could not accept trip" });
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

      return res.status(200).json({
        success: true,
        message: "Trip status updated successfully",
        trip
      });
    } catch (error) {
      return res.status(500).json({ success: false, message: "Could not update trip" });
    }
  }
};
