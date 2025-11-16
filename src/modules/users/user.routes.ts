// src/modules/users/user.routes.ts
import { Router } from 'express';
import { UserController } from './user.controller';

const router = Router();

router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUserById);

export default router;
