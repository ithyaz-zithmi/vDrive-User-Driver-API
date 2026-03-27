import { Request, Response, NextFunction } from 'express';
import { TripVerificationService } from './trip-verification.service';
import { successResponse } from '../../shared/errorHandler';
import { logger } from '../../shared/logger';

export class TripVerificationController {
    /**
     * Submit photos after S3 upload is complete
     */
    static async submitPhotos(req: Request, res: Response, next: NextFunction) {
        try {
            const { driverId } = req.params;
            const { selfie_url, car_image_url, car_images, trip_id } = req.body;

            logger.info(`Trip photos submission request for driver: ${driverId}`);

            const verification = await TripVerificationService.submitPhotos({
                driver_id: driverId as string,
                trip_id,
                selfie_url,
                car_image_url,
                car_images
            });

            return successResponse(res, 201, 'Trip photos submitted successfully', verification);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admin: Get comparison data (Trip Selfie vs Profile Selfie)
     */
    static async getComparisonData(req: Request, res: Response, next: NextFunction) {
        try {
            const { driverId } = req.params;
            const data = await TripVerificationService.getComparisonData(driverId as string);
            return successResponse(res, 200, 'Comparison data fetched successfully', data);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admin: Verify (Approve/Reject) the trip verification
     */
    static async verifyTrip(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params; // Verification ID
            const { status, remarks } = req.body;

            const verification = await TripVerificationService.verifyTrip(id as string, status, remarks);
            return successResponse(res, 200, `Trip verification ${status} successfully`, verification);
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get latest verification status for a driver
     */
    static async getLatestStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const { driverId } = req.params;
            const verification = await TripVerificationService.getLatestVerification(driverId as string);
            return successResponse(res, 200, 'Latest verification status fetched', verification);
        } catch (error) {
            next(error);
        }
    }

    /**
     * TEST ONLY: Force verify driver for testing
     */
    static async testVerifyDriver(req: Request, res: Response, next: NextFunction) {
        try {
            const { driverId } = req.params;
            await TripVerificationService.testForceVerifyDriver(driverId as string);
            return successResponse(res, 200, 'Driver trip status force-verified for testing');
        } catch (error) {
            next(error);
        }
    }
}
