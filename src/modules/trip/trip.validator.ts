import { Joi } from 'celebrate';
import * as tripSchema from '../../validations/schema/trip.schema';
import { idRule } from '../../validations/schema/common.schema';

export const TripValidation = {
  idValidation: Joi.object().keys({
    id: idRule,
  }),

  createTripValidation: Joi.object().keys({
    user_id: tripSchema.userIdRule,
    driver_id: tripSchema.driverIdRule.optional(),
    ride_type: tripSchema.rideTypeRule,
    service_type: tripSchema.serviceTypeRule,
    booking_type: tripSchema.bookingTypeRule,
    is_for_self: tripSchema.is_for_self,
    passenger_details: tripSchema.passenger_details,
    trip_status: tripSchema.tripStatusRule,
    original_scheduled_start_time: tripSchema.originalScheduledStartTimeRule,
    scheduled_start_time: tripSchema.scheduledStartTimeRule,
    pickup_lat: tripSchema.pickupLatRule,
    pickup_lng: tripSchema.pickupLngRule,
    pickup_address: tripSchema.pickupAddressRule,
    drop_lat: tripSchema.dropLatRule,
    drop_lng: tripSchema.dropLngRule,
    drop_address: tripSchema.dropAddressRule,
    distance_km: tripSchema.distanceKmRule,
    base_fare: tripSchema.baseFareRule,
    platform_fee: tripSchema.platformFeeRule,
    driver_allowance: tripSchema.driverAllowanceRule.optional(),
    total_fare: tripSchema.totalFareRule,
    payment_status: tripSchema.paymentStatusRule,
  }),

  updateTripValidation: Joi.object()
    .keys({
      driver_id: tripSchema.driverIdRule.optional(),
      ride_type: tripSchema.rideTypeRule,
      vehicle_id: tripSchema.vehicleIdRule.optional(),
      trip_status: tripSchema.tripStatusRule.optional(),
      scheduled_start_time: tripSchema.scheduledStartTimeRule,
      pickup_address: tripSchema.pickupAddressRule,
      drop_address: tripSchema.dropAddressRule,
      actual_pickup_time: tripSchema.actualPickupTimeRule,
      actual_drop_time: tripSchema.actualDropTimeRule,
      trip_duration_minutes: tripSchema.tripDurationMinutesRule,
      waiting_time_minutes: tripSchema.waitingTimeMinutesRule,
      waiting_charges: tripSchema.waitingChargesRule,
      driver_allowance: tripSchema.driverAllowanceRule,
      total_fare: tripSchema.totalFareRule.optional(),
      paid_amount: tripSchema.paidAmountRule,
      payment_status: tripSchema.paymentStatusRule,
      cancel_reason: tripSchema.cancelReasonRule,
      cancel_by: tripSchema.cancelByRule,
      notes: tripSchema.notesRule,
      rating: tripSchema.ratingRule,
      feedback: tripSchema.feedbackRule,
      re_route_id: tripSchema.reRouteIdRule,
    })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided to update',
    }),

  createTripChangesValidation: Joi.object().keys({
    trip_id: tripSchema.tripIdRule,
    change_type: tripSchema.changeTypeRule,
    old_value: tripSchema.oldValueRule,
    new_value: tripSchema.newValueRule,
    changed_by: tripSchema.changeByRule,
    notes: tripSchema.notesRule,
  }),


  acceptTripValidation: Joi.object().keys({
    trip_id: tripSchema.tripIdRule,
    driver_id: tripSchema.driverIdRule.optional(),
  }),

  updateTripStatusValidation: Joi.object().keys({
    trip_id: tripSchema.tripIdRule,
    trip_status: tripSchema.tripStatusRule.optional(),
  }),
};
