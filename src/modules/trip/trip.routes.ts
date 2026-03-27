import { Router } from 'express';
import { TripController } from './trip.controllers';
import { validateBody, validateParams } from '../../utilities/helper';
import { TripValidation } from './trip.validator';

const router = Router();

router.get('/', TripController.getTrips);
router.get('/active', TripController.getActiveTrip);

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

router.post('/:id/accept', validateParams(TripValidation.idValidation), TripController.acceptTrip);
router.post('/:id/start', validateParams(TripValidation.idValidation), TripController.startTrip);
router.post('/:id/arrived', validateParams(TripValidation.idValidation), TripController.arrivedTrip);
router.post(
  '/:id/cancel',
  validateParams(TripValidation.idValidation),
  validateBody(TripValidation.updateTripValidation),
  TripController.cancelTrip
);
router.post('/:id/complete', validateParams(TripValidation.idValidation), TripController.completeTrip);

// Location History (trip replay)
router.get('/:id/location-history', validateParams(TripValidation.idValidation), TripController.getTripLocationHistory);

// Test Simulation
router.post('/test-simulate-scheduled', TripController.testSimulateScheduled);
router.post('/test-simulate-live', TripController.testSimulateLive);

export default router;
