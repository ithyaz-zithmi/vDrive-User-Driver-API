import { Router } from 'express';
import { DriverDocumentsController } from './driver-documents.controller';

const router = Router();

router.get('/driver/:driverId', DriverDocumentsController.getDriverDocuments);
router.post('/upload/:driverId', DriverDocumentsController.uploadDocument);

export default router;
