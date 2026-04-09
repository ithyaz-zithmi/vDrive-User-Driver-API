import cron from 'node-cron';
import { SubscriptionRepository } from '../modules/subscriptions/subscription.repository';
import { TripSchedulerService } from '../modules/trip/trip-scheduler.service';
import { logger } from './logger';

export const initCronJobs = () => {
  // Daily at midnight
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running daily subscription expiration job...');
    try {
      const expiredCount = await SubscriptionRepository.expireReachedSubscriptions();
      logger.info(`Successfully expired ${expiredCount} subscriptions.`);
    } catch (error) {
      logger.error('Error running subscription expiration job:', error);
    }
  });
 
  // Trip Scheduler: Every minute
  cron.schedule('* * * * *', async () => {
    logger.debug('Processing scheduled rides...');
    try {
      await TripSchedulerService.processScheduledRides();
      await TripSchedulerService.broadcastUpcomingScheduledRides();
    } catch (error) {
      logger.error('Error in Trip Scheduler job:', error);
    }
  });

  console.log('✅ Cron jobs initialized');
};
