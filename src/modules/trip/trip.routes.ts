import { Router } from 'express';
import { TripController } from './trip.controllers';
import { validateBody, validateParams } from '../../utilities/helper';
import { TripValidation } from './trip.validator';

const router = Router();

router.get('/', TripController.getTrips);

router.get('/:id', validateParams(TripValidation.idValidation), TripController.getTripById);

router.post(
  '/create',
  validateBody(TripValidation.createTripValidation),
  TripController.createTrip
);

router.post(
  'change/create',
  validateBody(TripValidation.createTripChangesValidation),
  TripController.createTripChanges
);

router.patch(
  '/update/:id',
  validateParams(TripValidation.idValidation),
  validateBody(TripValidation.updateTripValidation),
  TripController.updateTrip
);

export default router;
