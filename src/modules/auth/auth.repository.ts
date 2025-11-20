// src/modules/users/user.repository.ts
import { query } from '../../shared/database';
import { User } from '../users/user.model';
import { OTP } from '../auth/otp.model';

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
    const result = await query('SELECT id, name FROM users WHERE id = $1', [userId]);
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

  async saveHashedOtp(
    phone_number: string,
    role: string,
    otpHash: string,
    expires_at: Date,
    attempt_count: number
  ): Promise<OTP | null> {
    const result = await query(
      `INSERT INTO OTP (phone_number, role, otp_hash, created_at, expires_at, attempt_count) VALUES ($1, $2, $3, $4, $5, $6)`,
      [phone_number, role, otpHash, new Date(), expires_at, attempt_count]
    );
    return result.rows[0] || null;
  },

  async verifyAttemptCount(phone_number: string, role: string): Promise<number> {
    const result = await query(
      'SELECT * FROM OTP WHERE phone_number = $1 AND role = $2 ORDER BY created_at DESC LIMIT 1',
      [phone_number, role]
    );

    return result?.rows[0]?.attempt_count ?? 1;
  },

  async getOtpData(phone_number: string, role: string) {
    const result = await query(
      'SELECT * FROM OTP WHERE phone_number = $1 AND role = $2 ORDER BY created_at DESC LIMIT 1',
      [phone_number, role]
    );

    return result?.rows[0];
  },

  async incrementAttemptCount(phone_number: string, role: string) {
    await query(
      `UPDATE OTP SET attempt_count = attempt_count + 1 WHERE phone_number=$1 AND role=$2 ORDER BY created_at DESC LIMIT 1`,
      [phone_number, role]
    );
  },

  async clearOtpRecord(phone_number: string, role: string) {
    await query(`DELETE FROM OTP WHERE phone_number=$1 AND role=$2`, [phone_number, role]);
  },

  async getUser(phone_number: string, role: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM users WHERE phone_number = $1 AND role = $2 LIMIT 1`,
      [phone_number, role]
    );

    return result?.rows[0];
  },
};
