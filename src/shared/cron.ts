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

  // Coupon Notification: Daily at 5 PM
  cron.schedule('0 15 * * *', async () => {
    logger.info('Running expiring coupon notification job...');
    const { CouponService } = require('../modules/coupon-management/coupon.service');
    try {
      await CouponService.sendExpiryNotificationsForAllCoupons();
      logger.info('Expiring coupon notification job completed successfully.');
    } catch (error) {
      logger.error('Error in Coupon Notification job:', error);
    }
  });

  console.log('✅ Cron jobs initialized');
};
