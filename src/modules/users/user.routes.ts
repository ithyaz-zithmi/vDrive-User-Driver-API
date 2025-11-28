import { Router } from 'express';
import { UserController } from './user.controller';
import { UserValidation } from './user.validator';
import { validateBody, validateParams } from '../../utilities/helper';

const router = Router();

router.post(
  '/create',
  validateBody(UserValidation.createUserValidation),
  UserController.createUser
);

router.get('/', UserController.getUsers);

router.get('/:id', validateParams(UserValidation.idValidation), UserController.getUserById);

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

export default router;
