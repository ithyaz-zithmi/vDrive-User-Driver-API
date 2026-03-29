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
                `SELECT t.*, d.status as driver_account_status, d.availability->>'status' as driver_status, d.fcm_token 
                 FROM trips t
                 JOIN drivers d ON t.driver_id = d.id
                 WHERE t.booking_type = 'SCHEDULED' 
                 AND t.trip_status = 'ACCEPTED'
                 AND t.scheduled_start_time > $1
                 AND t.scheduled_start_time < $1 + INTERVAL '70 minutes'`,
                [now]
            );

            for (const trip of result.rows) {
                const startTime = new Date(trip.scheduled_start_time);
                const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);

                // 1-hour reminder
                if (diffMinutes >= 55 && diffMinutes <= 65 && !trip.one_hour_reminder_sent) {
                    await NotificationService.sendNotificationToDriver(
                        trip.driver_id,
                        'One Hour Reminder',
                        `You have a scheduled trip in 1 hour at ${trip.pickup_address}. Please ensure you are online.`,
                        { type: 'SCHEDULED_REMINDER_1H', tripId: trip.trip_id }
                    );
                    await query('UPDATE trips SET one_hour_reminder_sent = true WHERE trip_id = $1', [trip.trip_id]);
                }

                // 30-minute reminder
                if (diffMinutes >= 28 && diffMinutes <= 32) {
                    if (trip.driver_status === 'ONLINE') {
                        await NotificationService.sendNotificationToDriver(
                            trip.driver_id,
                            'Upcoming Trip Reminder',
                            `You have a scheduled trip starting in 30 minutes at ${trip.pickup_address}.`,
                            { type: 'SCHEDULED_REMINDER_30M', tripId: trip.trip_id }
                        );
                    }
                }

                // 20-minute check & auto-re-dispatch
                if (diffMinutes >= 18 && diffMinutes <= 22) {
                    if (trip.driver_status === 'OFFLINE') {
                        logger.warn(`Auto-unassigning trip ${trip.trip_id} because driver ${trip.driver_id} is OFFLINE 20 mins before start.`);

                        // Reset trip to OPEN and REQUESTED
                         await query(
                            `UPDATE trips 
                             SET trip_status = 'REQUESTED', 
                                 scheduled_status = 'OPEN', 
                                 driver_id = NULL, 
                                 assigned_at = NULL, 
                                 re_dispatch_count = re_dispatch_count + 1,
                                 updated_at = NOW() 
                             WHERE trip_id = $1`,
                            [trip.trip_id]
                        );

                        // Recalculate flags for the offline driver
                        await DriverRepository.recalculateDriverScheduleFlags(trip.driver_id);

                        await NotificationService.sendNotificationToDriver(
                            trip.driver_id,
                            'Trip Unassigned',
                            'You were offline 20 minutes before a scheduled trip, so it has been unassigned.',
                            { type: 'TRIP_UNASSIGNED', tripId: trip.trip_id }
                        );

                        // Note: Re-broadcasting will be handled by broadcastUpcomingScheduledRides in its next run
                        // or we could call TripService.broadcastScheduledRide(trip) here.
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

            // 2. Fetch all ONLINE drivers
            const onlineDrivers = await query(
                `SELECT id, fcm_token FROM drivers 
                 WHERE availability->>'status' = 'ONLINE'
                 AND fcm_token IS NOT NULL`
            );

            for (const trip of result.rows) {
                for (const driver of onlineDrivers.rows) {
                    await NotificationService.sendNotification(
                        driver.fcm_token,
                        'New Scheduled Ride Request',
                        `A scheduled ride is starting soon at ${trip.pickup_address}.`,
                        {
                            type: 'ride_request',
                            trip_id: trip.trip_id,
                            pickup_address: trip.pickup_address,
                            drop_address: trip.drop_address,
                            total_fare: trip.total_fare?.toString() || '--',
                            distance_km: trip.distance_km?.toString() || '--',
                            trip_duration_minutes: trip.trip_duration_minutes?.toString() || '--',
                            ride_type: trip.ride_type,
                            booking_type: trip.booking_type,
                            scheduled_start_time: trip.scheduled_start_time.toISOString(),
                        }
                    );
                }
            }
        } catch (error: any) {
            logger.error(`Error in broadcastUpcomingScheduledRides: ${error.message}`);
        }
    }
};
