import { query } from '../../shared/database';
import { Trip } from './trip.model';
import { TripChanges } from './tripChanges.model';

export const TripRepository = {
  async findAll(): Promise<Trip[]> {
    const result = await query(
      `SELECT t.*, COALESCE( jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) FILTER (WHERE tc.id IS NOT NULL),'[]'::jsonb) AS trip_changes 
      FROM trips t LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id WHERE t.trip_status IN ('REQUESTED' ,'CANCELLED', 'COMPLETED') GROUP BY t.trip_id ORDER BY t.created_at DESC;`
    );
    return result.rows || null;
  },

  async findById(id: string): Promise<Trip | null> {
    const result = await query(
      `SELECT t.*, COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) FILTER (WHERE tc.id IS NOT NULL),'[]'::jsonb) AS trip_changes
      FROM trips t LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id WHERE t.trip_id = $1 AND t.trip_status = 'COMPLETED' GROUP BY t.trip_id;`,
      [id]
    );
    return result.rows[0] || null;
  },
  async findByUserId(userId: string): Promise<Trip[]> {
    const result = await query(
      `SELECT t.*, 
            COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) 
            FILTER (WHERE tc.id IS NOT NULL), '[]'::jsonb) AS trip_changes
     FROM trips t 
     LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id 
     WHERE t.user_id = $1 AND t.trip_status IN ('REQUESTED' ,'CANCELLED', 'COMPLETED')
     GROUP BY t.trip_id ORDER BY t.created_at DESC;`,
      [userId]
    );

    // Note: We return result.rows (plural) because one user can have many trips
    return result.rows || [];
  },
  // async findById(id: string): Promise<Trip | null> {
  //   const result = await query(
  //     `SELECT t.*, COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) FILTER (WHERE tc.id IS NOT NULL),'[]'::jsonb) AS trip_changes
  //     FROM trips t LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id WHERE t.id = $1 AND t.status = 'CANCELLED' GROUP BY t.id;`,
  //     [id]
  //   );
  //   return result.rows[0] || null;
  // },

  async createTrip(data: Partial<Trip>): Promise<Trip | null> {
    const result = await query(
      `
      INSERT INTO trips (user_id, ride_type, service_type,driver_allowance, trip_status, booking_type,is_for_self,passenger_details, original_scheduled_start_time, scheduled_start_time, pickup_lat, pickup_lng, pickup_address, drop_lat, drop_lng, drop_address, distance_km,trip_duration_minutes, base_fare, platform_fee, total_fare, paid_amount, payment_status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,NOW(),NOW())
      RETURNING *;
    `,
      [
        data.user_id,
        data.ride_type,
        data.service_type,
        data.driver_allowance || 0,
        data.trip_status,
        data.booking_type,
        data.is_for_self ?? true,
        data.passenger_details ? JSON.stringify(data.passenger_details) : null,
        data.original_scheduled_start_time,
        data.scheduled_start_time || null,
        data.pickup_lat,
        data.pickup_lng,
        data.pickup_address,
        data.drop_lat,
        data.drop_lng,
        data.drop_address,
        data.distance_km,
        data.trip_duration_minutes || 0,
        data.base_fare,
        data.platform_fee,
        data.total_fare,
        data.paid_amount || 0,
        data.payment_status || 'PENDING',
      ]
    );

    return result.rows[0] || null;
  },

  async updateTrip(trip_id: string, setQuery: string, values: any[]): Promise<Trip | null> {
    const result = await query(
      `UPDATE trips SET ${setQuery}, updated_at = NOW() WHERE trip_id = $${values.length + 1} RETURNING *;`,
      [...values, trip_id]
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
