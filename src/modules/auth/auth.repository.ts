import { query } from '../../shared/database';
import { User } from '../users/user.model';
import { OTP } from '../auth/otp.model';

export const AuthRepository = {
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
