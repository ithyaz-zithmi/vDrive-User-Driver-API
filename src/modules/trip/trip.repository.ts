import { UserRole } from '../../enums/user.enums';
import { query } from '../../shared/database';
import { Trip, TripDetailsType } from './trip.model';
import { TripChanges } from './tripChanges.model';

export const TripRepository = {
  //user-driver
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
      FROM trips t LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id WHERE t.trip_id = $1 GROUP BY t.trip_id;`,
      [id]
    );
    return result.rows[0] || null;
  },


  async findByUserId(userId: string, role: string): Promise<Trip[]> {
    let result;
    if (role === UserRole.CUSTOMER) {
      result = await query(
        `SELECT t.*, 
              COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) 
              FILTER (WHERE tc.id IS NOT NULL), '[]'::jsonb) AS trip_changes
       FROM trips t 
       LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id 
       WHERE t.user_id = $1 AND t.trip_status IN ('REQUESTED' ,'CANCELLED', 'COMPLETED')
       GROUP BY t.trip_id ORDER BY t.created_at DESC;`,
        [userId]
      );
    }
    else if (role === UserRole.DRIVER) {
      result = await query(
        `SELECT t.*, 
              COALESCE(jsonb_agg(to_jsonb(tc) ORDER BY tc.changed_at DESC) 
              FILTER (WHERE tc.id IS NOT NULL), '[]'::jsonb) AS trip_changes
       FROM trips t 
       LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id 
       WHERE t.driver_id = $1 AND t.trip_status IN ('REQUESTED' ,'CANCELLED', 'COMPLETED')
       GROUP BY t.trip_id ORDER BY t.created_at DESC;`,
        [userId]
      );
    }

    return result?.rows || [];
  },


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


  async findActiveTripByUserId(userId: string): Promise<any> {
    const result = await query(
      `SELECT 
        t.*, 
        d.full_name as driver_name,
        d.phone_number as driver_phone,
        COALESCE(
          (SELECT jsonb_agg(tc ORDER BY tc.changed_at DESC)
           FROM trip_changes tc
           WHERE tc.trip_id = t.trip_id), 
          '[]'::jsonb
        ) AS trip_changes
     FROM trips t 
     LEFT JOIN drivers d ON t.driver_id = d.id
     WHERE t.user_id = $1 
       -- AND t.is_for_self = true 
       -- Status check: Include all states that require an active UI overlay
       -- AND t.trip_status IN ( 'LIVE')

       AND t.trip_status NOT IN ('COMPLETED', 'CANCELLED','MID_CANCELLED')
       AND (
         (t.booking_type = 'LIVE' AND t.trip_status = 'LIVE')
         OR
         (t.booking_type = 'SCHEDULED')
       )
     ORDER BY t.created_at DESC;`,
      [userId]
    );
    const rows = result.rows || [];
    return {
      activeTrips: rows.filter(r => r.booking_type === 'LIVE'),
      scheduledTrips: rows.filter(r => r.booking_type === 'SCHEDULED')
    };
  },


  async acceptTrip(tripId: string, driverId: string): Promise<Trip | null> {
    const sql = `
            UPDATE trips 
            SET 
                trip_status = 'ACCEPTED', 
                driver_id = $1 
            WHERE 
                trip_id = $2 
                AND trip_status = 'REQUESTED'
            RETURNING *;
        `;
    try {
      const result = await query(sql, [driverId, tripId]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      console.error("Database Error in acceptTrip:", error);
      throw new Error("Failed to update trip acceptance in database");
    }
  },


  async getDriverDetails(driverId: string) {
    const sql = "SELECT * FROM drivers WHERE id = $1";
    const result = await query(sql, [driverId]);
    return result.rows[0];
  },



  //Admin
  async getAllTripsWithChanges(): Promise<TripDetailsType[]> {
    const sql = `
      SELECT 
        t.*, 
        u.full_name AS user_name, 
        u.phone_number AS user_phone,
        d.full_name AS driver_name,
        d.phone_number AS driver_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tc.id,
              'trip_id', tc.trip_id,
              'change_type', tc.change_type,
              'old_value', tc.old_value,
              'new_value', tc.new_value,
              'changed_by', tc.changed_by,
              'changed_at', tc.changed_at,
              'notes', tc.notes
            )
          ) FILTER (WHERE tc.id IS NOT NULL), '[]'
        ) AS trip_changes
      FROM trips t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN trip_changes tc ON t.trip_id = tc.trip_id
      GROUP BY t.trip_id, u.full_name, u.phone_number, d.full_name, d.phone_number
      ORDER BY t.created_at DESC;
    `;
    const result = await query(sql);
    return result.rows;
  },


  //TripChanges
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

  async updateTripStatus(tripId: string, tripStatus: string): Promise<Trip | null> {
    const sql = `UPDATE trips SET trip_status = $2 WHERE trip_id = $1 RETURNING *;`;
    try {
      const result = await query(sql, [tripId, tripStatus]);
      if (result.rows.length === 0) {
        return null;
      }
      return result.rows[0];
    } catch (error) {
      console.error("Database Error in updateTripStatus:", error);
      throw new Error("Failed to update trip Status in database");
    }
  },

};
