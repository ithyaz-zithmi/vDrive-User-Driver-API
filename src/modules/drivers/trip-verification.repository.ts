import { query } from '../../shared/database';
import { TripVerification, TripVerificationStatus } from './trip-verification.model';

export const TripVerificationRepository = {
  async findByDriverId(driverId: string): Promise<TripVerification[]> {
    const sqlQuery = `
      SELECT id, driver_id, trip_id, selfie_url, car_image_url, car_images, status, remarks, created_at, updated_at
      FROM trip_verifications
      WHERE driver_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sqlQuery, [driverId]);
    return result.rows as TripVerification[];
  },

  async findById(id: string): Promise<TripVerification | null> {
    const sqlQuery = `
      SELECT id, driver_id, trip_id, selfie_url, car_image_url, car_images, status, remarks, created_at, updated_at
      FROM trip_verifications
      WHERE id = $1
    `;
    const result = await query(sqlQuery, [id]);
    const row = result.rows[0];
    return row ? (row as TripVerification) : null;
  },

  async upsert(data: {
    driver_id: string;
    trip_id?: string;
    selfie_url: string;
    car_image_url?: string;
    car_images?: string[];
  }): Promise<TripVerification> {
    const insertQuery = `
      INSERT INTO trip_verifications (driver_id, trip_id, selfie_url, car_image_url, car_images, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING *
    `;

    const carImagesJson = data.car_images ? JSON.stringify(data.car_images) : null;

    const result = await query(insertQuery, [
      data.driver_id,
      data.trip_id || null,
      data.selfie_url,
      data.car_image_url || (data.car_images?.[0] || ''),
      carImagesJson
    ]);
    return result.rows[0] as TripVerification;
  },

  async updateStatus(
    id: string,
    status: TripVerificationStatus,
    remarks?: string
  ): Promise<TripVerification | null> {
    const sqlQuery = `
      UPDATE trip_verifications
      SET status = $2, remarks = $3, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    const result = await query(sqlQuery, [id, status, remarks || null]);
    const row = result.rows[0];
    return row ? (row as TripVerification) : null;
  },

  async deleteByDriverId(driverId: string): Promise<void> {
    const sqlQuery = 'DELETE FROM trip_verifications WHERE driver_id = $1';
    await query(sqlQuery, [driverId]);
  },
};
