import { TripVerificationRepository } from './trip-verification.repository';
import { TripVerification, TripVerificationStatus, CreateTripVerificationInput } from './trip-verification.model';
import { DriverRepository } from './driver.repository';
import { logger } from '../../shared/logger';
import { DriverDocumentsRepository } from './driver-documents.repository';

export class TripVerificationService {
    /**
     * Submit new photos for trip verification
     */
    static async submitPhotos(data: CreateTripVerificationInput): Promise<TripVerification> {
        logger.info(`Submitting trip verification photos for driver: ${data.driver_id}`);

        // Reset is_trip_verified to false when new photos are uploaded for a new trip
        await DriverRepository.update(data.driver_id, { is_trip_verified: false });

        return await TripVerificationRepository.upsert(data);
    }

    /**
     * Get the most recent trip verification for a driver
     */
    static async getLatestVerification(driverId: string): Promise<TripVerification | null> {
        const verifications = await TripVerificationRepository.findByDriverId(driverId);
        return verifications.length > 0 ? verifications[0] : null;
    }

    /**
     * Admin verification logic: Approves or rejects a trip verification
     */
    static async verifyTrip(
        id: string,
        status: TripVerificationStatus,
        remarks?: string
    ): Promise<TripVerification | null> {
        logger.info(`Admin verifying trip verification ${id} with status: ${status}`);

        const verification = await TripVerificationRepository.updateStatus(id, status, remarks);

        if (verification && status === 'approved') {
            // If approved, update the driver's is_trip_verified flag
            await DriverRepository.update(verification.driver_id, { is_trip_verified: true });
            logger.info(`Driver ${verification.driver_id} is now trip verified.`);
        } else if (verification && status === 'rejected') {
            // If rejected, ensure the flag is false
            await DriverRepository.update(verification.driver_id, { is_trip_verified: false });
        }

        return verification;
    }

    /**
     * Helper for admin: Get trip photo and profile photo side-by-side
     */
    static async getComparisonData(driverId: string) {
        const latestTripVerification = await this.getLatestVerification(driverId);
        const documents = await DriverDocumentsRepository.findByDriverId(driverId);
        const profileSelfie = documents.find(d => d.document_type === 'profile_selfie');

        return {
            tripVerification: latestTripVerification,
            profileSelfie: profileSelfie ? profileSelfie.document_url : null
        };
    }

    /**
     * TEST ONLY: Force verify a driver for testing purposes
     */
    static async testForceVerifyDriver(driverId: string): Promise<void> {
        logger.info(`Force verifying driver ${driverId} for testing`);
        
        // 1. Update driver flag
        await DriverRepository.update(driverId, { is_trip_verified: true });

        // 2. If there's a pending verification, approve it
        const latest = await this.getLatestVerification(driverId);
        if (latest && latest.status === 'pending') {
            await TripVerificationRepository.updateStatus(latest.id, 'approved', 'Auto-approved for testing');
        }
    }
}
