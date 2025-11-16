// src/modules/users/user.repository.ts
import { query } from '../../shared/database';
import { User } from './user.model';

export const UserRepository = {
  async findAll(): Promise<User[]> {
    const result = await query('SELECT * FROM users ORDER BY created_at DESC');
    return result.rows;
  },

  async findById(id: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  },
};
