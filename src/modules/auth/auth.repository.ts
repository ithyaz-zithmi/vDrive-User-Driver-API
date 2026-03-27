import { Driver } from './../drivers/driver.model';
import { query } from '../../shared/database';
import { User } from '../users/user.model';
import { OTP } from '../auth/otp.model';
import { UserRole } from '../../enums/user.enums';

export const AuthRepository = {
  async saveHashedOtp(
    phone_number: string,
    role: string,
    otpHash: string,
    expires_at: Date,
    attempt_count: number,
    request_count: number
  ): Promise<OTP | null> {
    const now = new Date();
    const result = await query(
      `INSERT INTO OTP (phone_number, role, otp_hash, created_at, expires_at, attempt_count, request_count, last_requested_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (phone_number, role) 
       DO UPDATE SET 
          otp_hash = EXCLUDED.otp_hash, 
          expires_at = EXCLUDED.expires_at, 
          attempt_count = EXCLUDED.attempt_count, 
          request_count = EXCLUDED.request_count,
          last_requested_at = EXCLUDED.last_requested_at,
          created_at = EXCLUDED.created_at
       RETURNING *`,
      [phone_number, role, otpHash, now, expires_at, attempt_count, request_count, now]
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
      `UPDATE OTP SET attempt_count = attempt_count + 1 WHERE id = (
        SELECT id FROM OTP WHERE phone_number=$1 AND role=$2 ORDER BY created_at DESC LIMIT 1
      )`,
      [phone_number, role]
    );
  },

  async blockUser(phone_number: string, role: string, blocked_until: Date) {
    await query(
      `UPDATE OTP SET blocked_until = $1 WHERE phone_number = $2 AND role = $3`,
      [blocked_until, phone_number, role]
    );
  },

  async resetRequestCount(phone_number: string, role: string) {
    await query(
      `UPDATE OTP SET request_count = 0 WHERE phone_number = $1 AND role = $2`,
      [phone_number, role]
    );
  },

  async clearOtpRecord(phone_number: string, role: string) {
    await query(`DELETE FROM OTP WHERE phone_number=$1 AND role=$2`, [phone_number, role]);
  },

  async getUser(phone_number: string, role: string): Promise<User | null> {
    if (role === 'driver') {
      const result = await query(
        `SELECT *, id AS "driverId" FROM drivers WHERE phone_number = $1 LIMIT 1`,
        [phone_number]
      );

      return result?.rows[0];
    } else {
      const result = await query(
        `SELECT * FROM users WHERE phone_number = $1 LIMIT 1`,
        [phone_number]
      );

      return result?.rows[0];
    }
  },

  async getDriver(phone_number: string, role: string): Promise<User | null> {
    const result = await query(
      `SELECT * FROM drivers WHERE phone_number = $1 AND role = $2 LIMIT 1`,
      [phone_number, role]
    );

    return result?.rows[0];
  },

  async signOutUser(id: string): Promise<boolean> {
    const result = await query(`UPDATE users SET device_id = NULL WHERE id = $1`, [id]);

    return (result?.rowCount ?? 0) > 0;
  },

  async userDeviceIDUpdate(id: string, device_id: string, role: string): Promise<boolean> {
    if (role === 'driver') {
      // Clear this device_id from any other driver first
      await query(`UPDATE drivers SET device_id = NULL WHERE device_id = $1 AND id != $2`, [
        device_id,
        id,
      ]);

      const result = await query(`UPDATE drivers SET device_id = $1 WHERE id = $2`, [
        device_id,
        id,
      ]);

      return (result?.rowCount ?? 0) > 0;
    } else {
      // Clear this device_id from any other user first
      await query(`UPDATE users SET device_id = NULL WHERE device_id = $1 AND id != $2`, [
        device_id,
        id,
      ]);

      const result = await query(`UPDATE users SET device_id = $1 WHERE id = $2`, [device_id, id]);

      return (result?.rowCount ?? 0) > 0;
    }
  },
};
