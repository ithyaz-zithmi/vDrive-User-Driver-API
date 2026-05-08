import cron from 'node-cron';
import { SubscriptionRepository } from '../modules/subscriptions/subscription.repository';
import { TripSchedulerService } from '../modules/trip/trip-scheduler.service';
import { logger } from './logger';
import { CouponService } from '../modules/coupon-management/coupon.service';
import { PromoService } from '../modules/promos/promo.service';
import { NotificationService } from '../modules/notification-management/notification-management.service';

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
  cron.schedule('0 17 * * *', async () => {
    logger.info('Running expiring coupon notification job...');
    try {
      await CouponService.sendExpiryNotificationsForAllCoupons();
      logger.info('Expiring coupon notification job completed successfully.');
    } catch (error) {
      logger.error('Error in Coupon Notification job:', error);
    }
  });

  // Background Email Campaign Processor: Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Checking for pending coupon notification campaigns...');
    try {
      await CouponService.processPendingNotifications();
    } catch (error) {
      logger.error('Error in Email Campaign Processor job:', error);
    }
  });

  // Background Promo Notification Processor: Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Checking for pending promo notification campaigns...');
    try {
      await PromoService.processPendingNotifications();
    } catch (error) {
      logger.error('Error in Email Campaign Processor job:', error);
    }
  });

  // Background Notification Processor: Every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Checking for processing notification...');
    try {
      await NotificationService.processQueue();
    } catch (error) {
      logger.error('Error in Notification job:', error);
    }
  });

  console.log('✅ Cron jobs initialized');
};
