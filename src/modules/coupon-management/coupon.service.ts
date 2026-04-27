import { CouponRepository } from './coupon.repository';
import { logger } from '../../shared/logger';
import { sendToTopic, sendToMultipleDevices } from '../../config/firebase';

export const CouponService = {
  /**
   * Validates a coupon for a specific ride
   */
  async validateCoupon(code: string, userId: string, rideAmount: number) {
    const coupon = await CouponRepository.findByCode(code);

    if (!coupon) {
      throw { statusCode: 404, message: 'Invalid or expired coupon code' };
    }

    if (!coupon.is_active) {
      throw { statusCode: 400, message: 'This coupon is no longer active' };
    }

    // Check expiry
    const now = new Date();
    if (new Date(coupon.valid_until) < now) {
      throw { statusCode: 400, message: 'This coupon has expired' };
    }

    if (new Date(coupon.valid_from) > now) {
      throw { statusCode: 400, message: 'This coupon is not yet valid' };
    }

    // Check minimum ride amount
    if (rideAmount < parseFloat(coupon.min_ride_amount)) {
      throw {
        statusCode: 400,
        message: `Min ride amount of ${coupon.min_ride_amount} required to use this coupon`
      };
    }

    // Check user eligibility
    if (coupon.user_eligibility !== 'ALL' && coupon.user_eligibility !== userId) {
      throw { statusCode: 400, message: 'You are not eligible for this coupon' };
    }

    // Check total usage limit
    if (coupon.usage_limit) {
      const totalUsed = await CouponRepository.getTotalUsageCount(coupon.id);
      if (totalUsed >= coupon.usage_limit) {
        throw { statusCode: 400, message: 'Coupon usage limit reached' };
      }
    }

    // Check per user limit
    if (coupon.per_user_limit) {
      const userUsed = await CouponRepository.getUserUsageCount(coupon.id, userId);
      if (userUsed >= coupon.per_user_limit) {
        throw { statusCode: 400, message: 'You have already reached the limit for this coupon' };
      }
    }

    return coupon;
  },

  /**
   * Calculates the discount amount for a given coupon and fare
   */
  calculateDiscount(coupon: any, rideAmount: number): number {
    let discount = 0;

    if (coupon.discount_type === 'PERCENTAGE') {
      discount = (rideAmount * parseFloat(coupon.discount_value)) / 100;
      if (coupon.max_discount_amount) {
        discount = Math.min(discount, parseFloat(coupon.max_discount_amount));
      }
    } else if (coupon.discount_type === 'FIXED') {
      discount = parseFloat(coupon.discount_value);
    }

    // Ensure discount doesn't exceed ride amount
    return Math.min(discount, rideAmount);
  },

  /**
   * Marks a coupon as used after a successful trip
   */
  async markAsUsed(couponId: string, userId: string, tripId: string, discountApplied: number) {
    try {
      await CouponRepository.trackUsage({
        coupon_id: couponId,
        user_id: userId,
        trip_id: tripId,
        discount_applied: discountApplied
      });
      logger.info(`Coupon ${couponId} marked as used for trip ${tripId}`);
    } catch (error) {
      logger.error(`Error marking coupon as used: ${error}`);
      // We don't want to fail the whole trip completion if coupon tracking fails,
      // but it's important to log it.
    }
  },

  /**
   * Cron job logic: Notify users about coupons expiring within 24 hours
   */
  async sendExpiryNotificationsForAllCoupons() {
    logger.info('Running expiring coupon notification job...');

    // Find coupons expiring in the next 24 hours
    const expiringCoupons = await CouponRepository.getExpiringCoupons(24);

    for (const coupon of expiringCoupons) {
      try {
        const payload = {
          type: 'COUPON_EXPIRY',
          title: 'Hurry! Coupon expires soon',
          body: `Your coupon ${coupon.code} expires in 24 hours`,
          data: { coupon_code: coupon.code }
        };

        if (coupon.user_eligibility === 'ALL') {
          // Broadcast via topic
          const topicName = `coupon_${coupon.code}`;
          await sendToTopic(topicName, payload);
          logger.info(`Broadcasted expiry notification for coupon ${coupon.code} via topic ${topicName}`);
        } else {
          // Targeted coupon -> send only to subscribed users
          const tokens = await CouponRepository.getSubscribedTokens(coupon.id);
          
          if (tokens.length > 0) {
            await sendToMultipleDevices(tokens, payload);
            logger.info(`Sent targeted expiry notifications for coupon ${coupon.code} to ${tokens.length} users`);
          } else {
            logger.info(`No subscribers found for targeted coupon ${coupon.code}`);
          }
        }
      } catch (error) {
        logger.error(`Error sending expiry notification for coupon ${coupon.id}: ${error}`);
      }
    }
  }
};
