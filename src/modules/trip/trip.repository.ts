import { query } from '../../shared/database';
import { Trip } from './trip.model';
import { TripChanges } from './tripChanges.model';

export const TripRepository = {
  async findAll(): Promise<Trip[]> {
    const result = await query(
      `SELECT t.*, u.full_name AS passenger_name, COALESCE( jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) FILTER (WHERE tc.trip_id IS NOT NULL),'[]'::jsonb) AS trip_changes 
      FROM trips t 
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id GROUP BY t.trip_id, u.full_name ORDER BY t.created_at DESC;`
    );
    return result.rows || [];
  },

  async findActiveRequests(bookingType?: string): Promise<Trip[]> {
    let sql = `
      SELECT t.*, u.full_name AS passenger_name 
      FROM trips t 
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.trip_status = 'REQUESTED'
    `;
    const params: any[] = [];

    if (bookingType) {
      sql += ` AND t.booking_type = $1`;
      params.push(bookingType);
    }

    // For scheduled rides, only show if starting within the next 24 hours OR already past start time but still requested
    if (bookingType === 'SCHEDULED') {
      sql += ` AND t.scheduled_start_time <= (NOW() + INTERVAL '24 hours')`;
    }

    sql += ` ORDER BY t.scheduled_start_time ASC, t.created_at DESC;`;

    const result = await query(sql, params);
    return result.rows || [];
  },

  async findById(id: string): Promise<Trip | null> {
    const result = await query(
      `SELECT t.*, u.full_name AS passenger_name, COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) FILTER (WHERE tc.trip_id IS NOT NULL),'[]'::jsonb) AS trip_changes
      FROM trips t 
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id WHERE t.trip_id = $1 GROUP BY t.trip_id, u.full_name;`,
      [id]
    );
    return result.rows[0] || null;
  },

  async createTrip(data: Partial<Trip>): Promise<Trip | null> {
    const columns = [
      'user_id', 'ride_type', 'service_type', 'booking_type', 'trip_status',
      'original_scheduled_start_time', 'scheduled_start_time', 'pickup_lat', 'pickup_lng',
      'pickup_address', 'drop_lat', 'drop_lng', 'drop_address', 'distance_km',
      'trip_duration_minutes', 'waiting_time_minutes', 'base_fare', 'waiting_charges',
      'driver_allowance', 'platform_fee', 'total_fare', 'paid_amount', 'payment_status',
      'created_at', 'updated_at'
    ];
    
    const values = [
      data.user_id,
      data.ride_type,
      data.service_type,
      data.booking_type,
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
      data.trip_duration_minutes || 0,
      data.waiting_time_minutes || 0,
      data.base_fare,
      data.waiting_charges || 0,
      data.driver_allowance || 0,
      data.platform_fee,
      data.total_fare,
      data.paid_amount || 0,
      data.payment_status || 'PENDING',
    ];

    if (data.trip_id) {
      columns.unshift('trip_id');
      values.unshift(data.trip_id);
    }

    const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
    const columnStr = columns.map(c => `"${c}"`).join(',');

    const result = await query(
      `INSERT INTO trips (${columnStr}) VALUES (${placeholders}, NOW(), NOW()) RETURNING *;`,
      values
    );

    return result.rows[0] || null;
  },

  async updateTrip(id: string, setQuery: string, values: any[]): Promise<Trip | null> {
    const result = await query(
      `UPDATE trips SET ${setQuery}, updated_at = NOW() WHERE trip_id = $${values.length + 1} RETURNING *;`,
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

  async findActivityByDriverId(driverId: string, from?: string, to?: string, status?: string): Promise<any[]> {
    let sql = `
      SELECT t.*, u.full_name AS passenger_name 
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.driver_id = $1
    `;
    const params: any[] = [driverId];

    if (from) {
      sql += ` AND t.created_at::DATE >= $${params.length + 1}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND t.created_at::DATE <= $${params.length + 1}`;
      params.push(to);
    }
    if (status) {
      sql += ` AND t.trip_status = $${params.length + 1}`;
      params.push(status.toUpperCase());
    }

    sql += ` ORDER BY t.created_at DESC`;

    const result = await query(sql, params);
    return result.rows;
  },

  async getStatsByDriverId(driverId: string): Promise<any> {
    const result = await query(
      `SELECT 
        COUNT(*) as total_trips,
        COUNT(CASE WHEN trip_status = 'COMPLETED' THEN 1 END) as completed_trips,
        COUNT(CASE WHEN trip_status = 'CANCELLED' THEN 1 END) as cancelled_trips,
        SUM(CASE WHEN trip_status = 'COMPLETED' THEN total_fare ELSE 0 END) as total_earnings
      FROM trips 
      WHERE driver_id = $1`,
      [driverId]
    );
    return result.rows[0];
  },
  
  async findActiveByDriverId(driverId: string): Promise<Trip | null> {
    const result = await query(
      `SELECT t.*, u.full_name AS passenger_name 
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.driver_id = $1 
      AND t.trip_status IN ('ACCEPTED', 'ARRIVED', 'LIVE')
      ORDER BY t.created_at DESC
      LIMIT 1;`,
      [driverId]
    );
    return result.rows[0] || null;
  },
};
