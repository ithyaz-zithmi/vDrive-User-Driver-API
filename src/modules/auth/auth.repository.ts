// src/modules/users/user.repository.ts
import { query } from '../../shared/database';
import { User } from '../users/user.model';

export const AuthRepository = {
  async createAdmin(data: {
    name: string;
    password: string;
    contact: string;
    alternate_contact: string;
    role: string;
  }): Promise<User> {
    const result = await query(
      'INSERT INTO users (name, password, contact, alternate_contact, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, contact, alternate_contact',
      [data.name, data.password, data.contact, data.alternate_contact, data.role]
    );
    return result.rows[0];
  },
  async getUserData(data: { user_name: string }): Promise<User> {
    const result = await query('SELECT id, name, password FROM users WHERE contact = $1', [
      data.user_name,
    ]);
    return result.rows[0];
  },
  async getUserDataById(userId: string): Promise<User> {
    const result = await query('SELECT id, name, password FROM users WHERE id = $1', [userId]);
    return result.rows[0];
  },
  async getUserDataBasedOnResetToken(data: { reset_token: string }): Promise<User> {
    const result = await query(
      'SELECT id, name, reset_token, reset_token_expiry  FROM users WHERE reset_token = $1',
      [data.reset_token]
    );
    return result.rows[0];
  },
  async updatePassword(data: { userId: string; new_password: string }): Promise<void> {
    await query('UPDATE users SET password = $1 WHERE id = $2', [data.new_password, data.userId]);
  },
  async storeResetToken(data: {
    userId: string;
    reset_token: string;
    expires_at: Date | null;
  }): Promise<void> {
    await query('UPDATE users SET reset_token = $1, reset_token_expiry = $2 WHERE id = $3', [
      data.reset_token,
      data.expires_at,
      data.userId,
    ]);
  },

  async getUserProfileById(userId: string): Promise<User | null> {
    const result = await query(
      'SELECT id, name, contact, alternate_contact, role, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  },
};
