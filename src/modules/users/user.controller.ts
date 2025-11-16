// src/modules/users/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { successResponse } from '../../shared/errorHandler';

export const UserController = {
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserService.getUsers();
      return successResponse(res, 200, 'Users fetched successfully', users);
    } catch (err) {
      next(err);
    }
  },

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return successResponse(res, 200, 'User fetched successfully', user);
    } catch (err) {
      next(err);
    }
  },
};
