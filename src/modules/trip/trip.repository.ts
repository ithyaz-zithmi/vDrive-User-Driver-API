import { query } from '../../shared/database';
import { Trip } from './trip.model';
import { TripChanges } from './tripChanges.model';

export const TripRepository = {
  async findAll(): Promise<Trip[]> {
    const result = await query(
      `SELECT t.*, COALESCE( jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) FILTER (WHERE tc.id IS NOT NULL),'[]'::jsonb) AS trip_changes 
      FROM trips t LEFT JOIN trip_changes tc ON t.id = tc.trip_id WHERE t.status = 'CANCELLED' GROUP BY t.id ORDER BY t.created_at DESC;`
    );
    return result.rows || null;
  },

  async findById(id: string): Promise<Trip | null> {
    const result = await query(
      `SELECT t.*, COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) FILTER (WHERE tc.id IS NOT NULL),'[]'::jsonb) AS trip_changes
      FROM trips t LEFT JOIN trip_changes tc ON t.id = tc.trip_id WHERE t.id = $1 AND t.status = 'CANCELLED' GROUP BY t.id;`,
      [id]
    );
    return result.rows[0] || null;
  },

  async createTrip(data: Partial<Trip>): Promise<Trip | null> {
    const result = await query(
      `
      INSERT INTO trips (user_id, ride_type, service_type, trip_status, original_scheduled_start_time, scheduled_start_time, pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address, distance_km, base_fare, platform_fee, total_fare, paid_amount, payment_status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW())
      RETURNING *;
    `,
      [
        data.user_id,
        data.ride_type,
        data.service_type,
        data.trip_status,
        data.original_scheduled_start_time,
        data.scheduled_start_time || null,
        data.pickup_lat,
        data.pickup_lng,
        data.pickup_address,
        data.drop_lat,
        data.drop_lng,
        data.drop_address,
        data.distance_km,
        data.base_fare,
        data.platform_fee,
        data.total_fare,
        data.paid_amount || 0,
        data.payment_status || 'PENDING',
      ]
    );

    return result.rows[0] || null;
  },

  async updateTrip(id: string, setQuery: string, values: any[]): Promise<Trip | null> {
    const result = await query(
      `UPDATE users SET ${setQuery}, updated_at = NOW() WHERE id = $${values.length + 1} RETURNING *;`,
      [...values, id]
    );

    return result.rows[0] || null;
  },

  async createTripChanges(data: TripChanges): Promise<Trip | null> {
    const result = await query(
      `INSERT INTO trip_changes (trip_id, change_type, old_value, new_value,changed_by, changed_at, notes) VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, NOW(), $6) RETURNING *;`,
      [
        data.trip_id,
        data.change_type,
        data.old_value ? JSON.stringify(data.old_value) : null,
        JSON.stringify(data.new_value),
        data.changed_by,
        data.notes,
      ]
    );
    return result.rows[0] || null;
  },
};
