// src/modules/users/user.service.ts
import { UserRepository } from './user.repository';

export const UserService = {
  async getUsers() {
    return await UserRepository.findAll();
  },

  async getUserById(id: string) {
    const user = await UserRepository.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'User not found' };
    }
    return user;
  },
};
