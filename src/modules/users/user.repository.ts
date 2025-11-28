// src/modules/users/user.repository.ts
import { query } from '../../shared/database';
import { User } from './user.model';

export const UserRepository = {
  async findAll(): Promise<User[]> {
    const result = await query(
      `SELECT * FROM users WHERE status <> 'deleted' ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async findById(id: string, status: string): Promise<User | null> {
    const result = await query('SELECT * FROM users WHERE id = $1 AND status <> $2', [id, status]);
    return result.rows[0] || null;
  },

  async createUser(data: User): Promise<User | null> {
    const result = await query(
      `INSERT INTO users (name, phone_number, alternate_contact, role, gender, date_of_birth, status, email, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *;`,
      [
        data.name,
        data.phone_number,
        data.alternate_contact,
        data.role,
        data.gender,
        data.date_of_birth,
        data.status,
        data.email,
      ]
    );

    return result.rows[0] || null;
  },
  async updateUser(id: string, setQuery: string, values: any[]): Promise<User | null> {
    const result = await query(
      `UPDATE users SET ${setQuery}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *;`,
      [...values, id]
    );

    return result.rows[0] || null;
  },

  async deleteUser(id: string, status: string): Promise<User | null> {
    const result = await query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *;`,
      [status, id]
    );

    return result.rows[0] || null;
  },
};
