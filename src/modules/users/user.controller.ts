// src/modules/users/user.controller.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { successResponse } from '../../shared/errorHandler';
import { User } from './user.model';
import { UserStatus, UserRole } from '../../enums/user.enums';
import { logger } from '../../shared/logger';
import { cleanUndefined, formFullName } from '../../utilities/helper';

export const UserController = {
  async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const { users, total } = await UserService.getUsers(page, limit, search, UserRole.CUSTOMER);
      const totalPages = Math.ceil(total / limit);

      return successResponse(res, 200, 'Customers fetched successfully', {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (err: any) {
      logger.error(`getCustomers error: ${err.message}`);
      next(err);
    }
  },

  async getDrivers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const { users, total } = await UserService.getUsers(page, limit, search, UserRole.DRIVER);
      const totalPages = Math.ceil(total / limit);

      return successResponse(res, 200, 'Drivers fetched successfully', {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (err: any) {
      logger.error(`getDrivers error: ${err.message}`);
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
        first_name: req.body.first_name ?? '',
        last_name: req.body.last_name ?? '',
        full_name: formFullName(req.body.first_name, req.body.last_name),
        phone_number: req.body.phone_number,
        alternate_contact: req.body.alternate_contact || '',
        date_of_birth: req.body.date_of_birth || null,
        role: req.body.role,
        status: req.body.status || UserStatus.ACTIVE,
        gender: req.body.gender || '',
        email: req.body.email || '',
        device_id: req.body.device_id || '',
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

      const existingUser = await UserService.getUserById(id);
      if (!existingUser) {
        throw { statusCode: 404, message: 'User not found' };
      }

      const { first_name, last_name, ...rest } = req.body;

      const finalFirstName = first_name ?? existingUser.first_name;
      const finalLastName = last_name ?? existingUser.last_name;

      const updateUserData: Partial<User> = {
        first_name,
        last_name,
        phone_number: rest.phone_number,
        alternate_contact: rest.alternate_number,
        date_of_birth: rest.date_of_birth,
        role: rest.role,
        status: rest.status,
        gender: rest.gender,
        email: rest.email,
      };

      updateUserData.full_name = formFullName(finalFirstName, finalLastName);
      const updateData = cleanUndefined(updateUserData);
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
      return successResponse(res, 200, 'User deleted successfully', user);
    } catch (err: any) {
      logger.error(`deleteUser error: ${err.message}`);
      next(err);
    }
  },

  async blockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.blockUser(req.params.id);
      return successResponse(res, 200, 'User blocked successfully', user);
    } catch (err: any) {
      logger.error(`blockUser error: ${err.message}`);
      next(err);
    }
  },

  async unblockUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.unblockUser(req.params.id);
      return successResponse(res, 200, 'User unblocked successfully', user);
    } catch (err: any) {
      logger.error(`unblockUser error: ${err.message}`);
      next(err);
    }
  },

  async disableUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.disableUser(req.params.id);
      return successResponse(res, 200, 'User disabled successfully', user);
    } catch (err: any) {
      logger.error(`disableUser error: ${err.message}`);
      next(err);
    }
  },
};
