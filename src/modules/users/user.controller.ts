// src/modules/users/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { successResponse } from '../../shared/errorHandler';
import { User } from './user.model';
import { UserStatus } from '../../enums/user.enums';
import { logger } from '../../shared/logger';

export const UserController = {
  async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await UserService.getUsers();
      return successResponse(res, 200, 'Users fetched successfully', users);
    } catch (err: any) {
      logger.error(`getUsers error: ${err.message}`);
      next(err);
    }
  },

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getUserById(req.params.id);
      return successResponse(res, 200, 'User fetched successfully', user);
    } catch (err: any) {
      logger.error(`getUserById error: ${err.message}`);
      next(err);
    }
  },

  async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const body: User = {
        name: req.body.name,
        phone_number: req.body.phoneNumber,
        alternate_contact: req.body.alternateNumber || '',
        date_of_birth: req.body.dateOfBirth || null,
        role: req.body.role,
        status: req.body.status || UserStatus.ACTIVE,
        gender: req.body.gender || '',
        email: req.body.email || '',
      };

      const user = await UserService.createUser(body);

      return successResponse(res, 200, 'User created successfully', user);
    } catch (err: any) {
      logger.error(`createUser error: ${err.message}`);
      next(err);
    }
  },

  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const updateData = Object.fromEntries(
        Object.entries({
          name: req.body.name,
          phone_number: req.body.phoneNumber,
          alternate_contact: req.body.alternateNumber,
          role: req.body.role,
          gender: req.body.gender,
          date_of_birth: req.body.dateOfBirth,
          status: req.body.status,
          email: req.body.email,
        }).filter(([_, value]) => value !== undefined)
      );

      const updatedUser = await UserService.updateUser(id, updateData);

      return successResponse(res, 200, 'User updated successfully', updatedUser);
    } catch (err: any) {
      logger.error(`updateUser error: ${err.message}`);
      next(err);
    }
  },

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.deleteUser(req.params.id);
      return successResponse(res, 200, 'User fetched successfully', user);
    } catch (err: any) {
      logger.error(`deleteUser error: ${err.message}`);
      next(err);
    }
  },
};
