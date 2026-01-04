import { Router } from 'express';
import { UserController } from './user.controller';
import { UserValidation } from './user.validator';
import { validateBody, validateParams, validateQuery } from '../../utilities/helper';
import driverDocumentsRoutes from '../drivers/driver-documents.routes';

const router = Router();

router.get('/', UserController.getUsers);

router.get('/:id', validateParams(UserValidation.idValidation), UserController.getUserById);

router.post('/', validateBody(UserValidation.createUserValidation), UserController.createUser);

router.patch(
  '/:id',
  validateParams(UserValidation.idValidation),
  validateBody(UserValidation.updateUserValidation),
  UserController.updateUser
);

router.delete('/:id', validateParams(UserValidation.idValidation), UserController.deleteUser);

router.patch('/block/:id', validateParams(UserValidation.idValidation), UserController.blockUser);

router.patch(
  '/unblock/:id',
  validateParams(UserValidation.idValidation),
  UserController.unblockUser
);

router.patch(
  '/disable/:id',
  validateParams(UserValidation.idValidation),
  UserController.disableUser
);

router.patch('/enable/:id', validateParams(UserValidation.idValidation), UserController.enableUser);

router.get('/search', validateQuery(UserValidation.searchValidation), UserController.searchUsers);

// Driver documents routes
router.use('/documents', driverDocumentsRoutes);

export default router;
