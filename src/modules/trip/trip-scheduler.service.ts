import { query } from '../../shared/database';
import { logger } from '../../shared/logger';
import { NotificationService } from '../notifications/notification.service';
import { DriverRepository } from '../drivers/driver.repository';

export const TripSchedulerService = {
    /**
     * Periodically called by cron to handle reminders and unassignments
     */
    async processScheduledRides() {
        try {
            const now = new Date();

            // 1. Fetch upcoming accepted scheduled rides
            const result = await query(
                `SELECT t.*, d.availability->>'status' as driver_status, d.fcm_token 
         FROM trips t
         JOIN drivers d ON t.driver_id = d.id
         WHERE t.booking_type = 'SCHEDULED' 
         AND t.trip_status = 'ACCEPTED'
         AND t.scheduled_start_time > $1
         AND t.scheduled_start_time < $1 + INTERVAL '35 minutes'`,
                [now]
            );

            for (const trip of result.rows) {
                const startTime = new Date(trip.scheduled_start_time);
                const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);

                // a. 30-minute reminder
                if (diffMinutes >= 28 && diffMinutes <= 32) {
                    if (trip.driver_status === 'ONLINE') {
                        await NotificationService.sendNotificationToDriver(
                            trip.driver_id,
                            'Upcoming Trip Reminder',
                            `You have a scheduled trip starting in 30 minutes at ${trip.pickup_address}.`,
                            { type: 'SCHEDULED_REMINDER', tripId: trip.trip_id }
                        );
                    } else {
                        logger.info(`Skipping 30-minute reminder for trip ${trip.trip_id} as driver ${trip.driver_id} is OFFLINE.`);
                    }
                }

                // b. 10-minute check & auto-unassign
                if (diffMinutes >= 8 && diffMinutes <= 12) {
                    if (trip.driver_status === 'OFFLINE') {
                        // Unassign
                        logger.warn(`Auto-unassigning trip ${trip.trip_id} because driver ${trip.driver_id} is OFFLINE 10 mins before start.`);

                        await query(
                            "UPDATE trips SET trip_status = 'REQUESTED', driver_id = NULL, updated_at = NOW() WHERE trip_id = $1",
                            [trip.trip_id]
                        );

                        await NotificationService.sendNotificationToDriver(
                            trip.driver_id,
                            'Trip Unassigned',
                            'You were offline 10 minutes before a scheduled trip, so it has been unassigned.',
                            { type: 'TRIP_UNASSIGNED', tripId: trip.trip_id }
                        );

                        // Notify admin/system or put back in pool
                    } else {
                        // Just a 10-minute reminder if they are online
                        await NotificationService.sendNotificationToDriver(
                            trip.driver_id,
                            'Final Trip Reminder',
                            `Your scheduled trip starts in 10 minutes. Please head to ${trip.pickup_address}.`,
                            { type: 'SCHEDULED_REMINDER', tripId: trip.trip_id }
                        );
                    }
                }
            }
        } catch (error: any) {
            logger.error(`Error in processScheduledRides: ${error.message}`);
        }
    },

    /**
     * Broadcasts REQUESTED scheduled rides starting soon to ONLINE drivers
     */
    async broadcastUpcomingScheduledRides() {
        try {
            const now = new Date();

            // 1. Fetch scheduled rides starting in < 20 minutes that are still REQUESTED
            const result = await query(
                `SELECT t.*, u.full_name as passenger_name 
                 FROM trips t
                 LEFT JOIN users u ON t.user_id = u.id
                 WHERE t.booking_type = 'SCHEDULED' 
                 AND t.trip_status = 'REQUESTED'
                 AND t.scheduled_start_time > $1
                 AND t.scheduled_start_time < $1 + INTERVAL '20 minutes'`,
                [now]
            );

            if (result.rows.length === 0) return;

            // 2. Fetch UNIQUE fcm_tokens for drivers with active status and subscription (Online & Offline)
            const eligibleDrivers = await query(
                `SELECT DISTINCT fcm_token FROM drivers 
                 WHERE status = 'active'
                 AND onboarding_status = 'SUBSCRIPTION_ACTIVE'
                 AND fcm_token IS NOT NULL`
            );

            for (const trip of result.rows) {
                for (const driver of eligibleDrivers.rows) {
                    await NotificationService.sendNotification(
                        driver.fcm_token,
                        'New Scheduled Ride Request',
                        `A scheduled ride is starting soon at ${trip.pickup_address}.`,
                        {
                            type: 'ride_request',
                            trip_id: String(trip.trip_id || ''),
                            pickup_address: String(trip.pickup_address || ''),
                            drop_address: String(trip.drop_address || ''),
                            total_fare: trip.total_fare?.toString() || '--',
                            distance_km: trip.distance_km?.toString() || '--',
                            trip_duration_minutes: trip.trip_duration_minutes?.toString() || '--',
                            ride_type: String(trip.ride_type || ''),
                            booking_type: String(trip.booking_type || ''),
                            scheduled_start_time: trip.scheduled_start_time instanceof Date 
                                ? trip.scheduled_start_time.toISOString() 
                                : String(trip.scheduled_start_time || ''),
                        }
                    );
                }
            }
        } catch (error: any) {
            logger.error(`Error in broadcastUpcomingScheduledRides: ${error.message}`);
        }
    },

    /**
     * Immediately broadcasts a NEWly created scheduled ride to all eligible drivers
     */
    async broadcastNewScheduledRide(trip: any, io?: any) {
        try {
            // Fetch UNIQUE fcm_tokens for drivers with active status and subscription (Online & Offline)
            const eligibleDrivers = await query(
                `SELECT DISTINCT fcm_token FROM drivers 
                 WHERE status = 'active'
                 AND onboarding_status = 'SUBSCRIPTION_ACTIVE'
                 AND fcm_token IS NOT NULL`
            );

            for (const driver of eligibleDrivers.rows) {
                await NotificationService.sendNotification(
                    driver.fcm_token,
                    'New Scheduled Ride Available',
                    `A new scheduled ride is available for ${trip.scheduled_start_time}. Pickup: ${trip.pickup_address}`,
                    {
                        type: 'ride_request',
                        trip_id: String(trip.trip_id || ''),
                        pickup_address: String(trip.pickup_address || ''),
                        drop_address: String(trip.drop_address || ''),
                        total_fare: trip.total_fare?.toString() || '--',
                        distance_km: trip.distance_km?.toString() || '--',
                        trip_duration_minutes: trip.trip_duration_minutes?.toString() || '--',
                        ride_type: String(trip.ride_type || ''),
                        booking_type: String(trip.booking_type || ''),
                        scheduled_start_time: trip.scheduled_start_time instanceof Date 
                            ? trip.scheduled_start_time.toISOString() 
                            : String(trip.scheduled_start_time || ''),
                    }
                );
            }

            // 📍 REAL-TIME: Broadcast via Sockets if io is provided
            if (io) {
                console.log(`📡 Broadcasting NEW_TRIP_REQUEST via Sockets for trip ${trip.trip_id}`);
                io.emit('NEW_TRIP_REQUEST', { trip });
            }
        } catch (error: any) {
            logger.error(`Error in broadcastNewScheduledRide: ${error.message}`);
        }
    }

};
