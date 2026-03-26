import { Router } from 'express';
import { TripController } from './trip.controllers';
import { validateBody, validateParams } from '../../utilities/helper';
import { TripValidation } from './trip.validator';

const router = Router();

// Admin 
router.get('/', TripController.getAllTripsWithChanges);

//user-driver  
router.get('/bytripid/:id', validateParams(TripValidation.idValidation), TripController.getTripById);
router.get('/all', TripController.getTrips);
router.get('/activetrip/:id', validateParams(TripValidation.idValidation), TripController.getActiveTripByUserId)

//Trip
router.post(
  '/create',
  validateBody(TripValidation.createTripValidation),
  TripController.createTrip
);

router.post('/:id', validateParams(TripValidation.idValidation), TripController.getTripByUserId);
router.patch(
  '/update/:id',
  validateParams(TripValidation.idValidation),
  validateBody(TripValidation.updateTripValidation),
  TripController.updateTrip
);
router.patch(
  '/cancel/:id',
  validateParams(TripValidation.idValidation),
  validateBody(TripValidation.cancelTripValidation),
  TripController.cancelTrip
);

router.post('/accept',
  validateParams(TripValidation.idValidation),
  validateBody(TripValidation.acceptTripValidation),
  TripController.acceptTripController
);

//Tripchanges
router.post(
  '/change/create',
  validateBody(TripValidation.createTripChangesValidation),
  TripController.createTripChanges
);

router.post('/status/:id',
  validateParams(TripValidation.idValidation),
  validateBody(TripValidation.updateTripStatusValidation),
  TripController.updateTripStatusController
);

router.post('/:id/accept', validateParams(TripValidation.idValidation), TripController.acceptTrip);
router.post('/:id/start', validateParams(TripValidation.idValidation), TripController.startTrip);
router.post('/:id/arrived', validateParams(TripValidation.idValidation), TripController.arrivedTrip);
router.post('/:id/complete', validateParams(TripValidation.idValidation), TripController.completeTrip);


export default router;
