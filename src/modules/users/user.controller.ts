import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { successResponse } from '../../shared/errorHandler';
import { User } from './user.model';
import { UserStatus } from '../../enums/user.enums';
import { logger } from '../../shared/logger';
import { cleanUndefined, formFullName } from '../../utilities/helper';

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
        device_id:rest.device_id,
        alternate_contact: rest.alternate_number,
        date_of_birth: rest.date_of_birth,
        role: rest.role,
        status: rest.status,
        gender: rest.gender,
        email: rest.email,
        favourite_places:rest.favourite_places,
        emergency_contacts: rest.emergency_contacts,
        settings_preferences: rest.settings_preferences,
        profile_url:rest.profile_url || ''
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
};
