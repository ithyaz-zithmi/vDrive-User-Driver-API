import { Router } from 'express';
import { SosController } from './sos.controller';
import { isAuthenticatedOrService } from '../../shared/serviceAuthentication';

const router = Router();

// Allow either driver authentication or Admin Backend service authentication
router.use(isAuthenticatedOrService);

// SOS triggering and tracking
router.get('/active', SosController.getActiveSos);
router.post('/trigger', SosController.triggerSos);
router.post('/location', SosController.updateLocation);
router.post('/resolve', SosController.resolveSos);

// Trusted Contacts management
router.get('/contacts', SosController.getTrustedContacts);
router.post('/contacts', SosController.addTrustedContact);
router.delete('/contacts/:id', SosController.removeTrustedContact);

export default router;
