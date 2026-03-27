import { Router } from 'express';
import { TripVerificationController } from './trip-verification.controller';
// import { authenticate, authorize } from '../../shared/middlewares/auth'; // Hypothetical middlewares

const router = Router();

// Driver endpoints
router.post('/submit/:driverId', TripVerificationController.submitPhotos);
router.get('/status/:driverId', TripVerificationController.getLatestStatus);

// Admin endpoints
router.get('/comparison/:driverId', TripVerificationController.getComparisonData);
router.put('/verify/:id', TripVerificationController.verifyTrip);

// TEST ONLY
router.post('/test-verify/:driverId', TripVerificationController.testVerifyDriver);

export default router;
