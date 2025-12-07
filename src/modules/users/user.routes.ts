// src/modules/users/user.routes.ts
import { Router } from 'express';
import { UserController } from './user.controller';
import driverDocumentsRoutes from './driver-documents.routes';

const router = Router();

router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUserById);

// Driver documents routes
router.use('/documents', driverDocumentsRoutes);

export default router;
