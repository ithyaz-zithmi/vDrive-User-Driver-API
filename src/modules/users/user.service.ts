import { UserRepository } from './user.repository';
import { User } from '../users/user.model';
import { UserStatus } from '../../enums/user.enums';

export const UserService = {
  async getUsers() {
    return await UserRepository.findAll();
  },

  async getUserById(id: string) {
    const user = await UserRepository.findById(id, UserStatus.DELETED);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
  },

  async createUser(data: User) {
    const user = await UserRepository.createUser(data);
    if (!user) {
      throw {
        statusCode: 500,
        message: 'User not found or could not be created',
      };
    }

    return user;
  },

  async updateUser(id: string, data: Partial<User>) {
    const fields = Object.keys(data);
    if (fields.length === 0) return null;

    const setQuery = fields.map((field, index) => `"${field}" = $${index + 1}`).join(', ');

    const values = Object.values(data).map(value => 
        (typeof value === 'object' && value !== null) ? JSON.stringify(value) : value
    );    
    const user = await UserRepository.updateUser(id, setQuery, values);

    if (!user) {
      throw { statusCode: 500, message: 'Update user failed' };
    }

    return user;
  },

  async deleteUser(id: string) {
    const user = await UserRepository.deleteUser(id, UserStatus.DELETED);
    if (!user) {
      throw { statusCode: 500, message: 'Delete user Failed' };
    }
    return user;
  },
};
