import { Router } from 'express';
import { UserController } from './user.controller';
import { UserValidation } from './user.validator';
import { validateBody, validateParams } from '../../utilities/helper';
import driverDocumentsRoutes from './driver-documents.routes';

const router = Router();

router.get('/', UserController.getUsers);

router.get('/:id', validateParams(UserValidation.idValidation), UserController.getUserById);

router.post(
  '/create',
  validateBody(UserValidation.createUserValidation),
  UserController.createUser
);

router.patch(
  '/update/:id',
  validateParams(UserValidation.idValidation),
  validateBody(UserValidation.updateUserValidation),
  UserController.updateUser
);

router.delete(
  '/delete/:id',
  validateParams(UserValidation.idValidation),
  UserController.deleteUser
);

// Driver documents routes
router.use('/documents', driverDocumentsRoutes);

export default router;
