import { Router } from 'express';
import { SosController } from './sos.controller';
import isAuthenticated from '../../shared/authentication';

const router = Router();

// Driver authentication required for all SOS routes
router.use(isAuthenticated);

// SOS triggering and tracking
router.post('/trigger', SosController.triggerSos);
router.post('/location', SosController.updateLocation);
router.post('/resolve', SosController.resolveSos);

// Trusted Contacts management
router.get('/contacts', SosController.getTrustedContacts);
router.post('/contacts', SosController.addTrustedContact);
router.delete('/contacts/:id', SosController.removeTrustedContact);

export default router;
