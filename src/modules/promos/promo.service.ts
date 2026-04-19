import { PromoRepository } from './promo.repository';
import { TripRepository } from '../trip/trip.repository';
import { ValidatePromoResponse } from './promo.model';

export const PromoService = {
  async validatePromo(code: string, driverId: string, currentAmount: number): Promise<ValidatePromoResponse> {
    const promo = await PromoRepository.findByCode(code);

    if (!promo) {
      return { isValid: false, discountAmount: 0, message: 'Invalid or expired promo code' };
    }

    // 1. Global usage limit check
    if (promo.max_uses !== null && promo.max_uses !== undefined) {
      const totalUsed = await PromoRepository.getUsageCount(promo.id);
      if (totalUsed >= promo.max_uses) {
        return { isValid: false, discountAmount: 0, message: 'Promo code usage limit reached' };
      }
    }

    // 2. Per-driver usage limit check
    const driverUsed = await PromoRepository.getUsageCount(promo.id, driverId);
    if (driverUsed >= promo.max_uses_per_driver) {
      return { isValid: false, discountAmount: 0, message: 'You have already used this promo code' };
    }

    // 3. Targeting & Eligibility Logic
    if (promo.target_type === 'specific_driver') {
      if (promo.target_driver_id !== driverId) {
        return { isValid: false, discountAmount: 0, message: 'This offer is not valid for your account' };
      }
    } else if (promo.target_type === 'ride_count_based') {
      const stats = await TripRepository.getStatsByDriverId(driverId);
      const completedRides = parseInt(stats?.completed_trips || '0');
      
      if (completedRides < promo.min_rides_required) {
        return { 
          isValid: false, 
          discountAmount: 0, 
          message: `This offer requires a minimum of ${promo.min_rides_required} completed rides. You have ${completedRides}.` 
        };
      }
    }

    // 4. Calculate Discount
    let discountAmount = 0;
    if (promo.discount_type === 'percentage') {
      discountAmount = (currentAmount * promo.discount_value) / 100;
    } else {
      discountAmount = Math.min(Number(promo.discount_value), currentAmount);
    }

    return {
      isValid: true,
      promo,
      discountAmount,
      message: 'Promo applied successfully'
    };
  },

  async usePromo(promoId: number, driverId: string, paymentId: number, discountApplied: number, client?: any) {
    return await PromoRepository.recordUsage({
      promo_id: promoId,
      driver_id: driverId,
      payment_id: paymentId,
      discount_applied: discountApplied
    }, client);
  },

  async getAllPromos() {
    return await PromoRepository.findAll();
  },

  async getPromoById(id: number) {
    return await PromoRepository.findById(id);
  },

  async createPromo(data: any) {
    return await PromoRepository.create(data);
  },

  async updatePromo(id: number, data: any) {
    return await PromoRepository.update(id, data);
  },

  async deletePromo(id: number) {
    return await PromoRepository.delete(id);
  },

  async getAvailablePromosForDriver(driverId: string) {
    return await PromoRepository.findAvailableForDriver(driverId);
  }
};
