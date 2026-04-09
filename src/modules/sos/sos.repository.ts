import { query } from '../../shared/database';
import { SosEvent, SosLocation, TrustedContact } from './sos.model';

export class SosRepository {
  static async createSosEvent(user_id: string, user_type: 'driver' | 'user', trip_id?: string): Promise<SosEvent> {
    const result = await query(
      'INSERT INTO sos_events (user_id, user_type, trip_id, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [user_id, user_type, trip_id, 'ACTIVE']
    );
    return result.rows[0];
  }

  static async addSosLocation(sos_id: string, latitude: number, longitude: number): Promise<void> {
    await query(
      'INSERT INTO sos_locations (sos_id, latitude, longitude) VALUES ($1, $2, $3)',
      [sos_id, latitude, longitude]
    );
  }

  static async resolveSosEvent(id: string): Promise<void> {
    await query(
      "UPDATE sos_events SET status = 'RESOLVED', resolved_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );
  }

  static async findActiveSosByUser(user_id: string, user_type: 'driver' | 'user'): Promise<SosEvent | null> {
    const result = await query(
      "SELECT * FROM sos_events WHERE user_id = $1 AND user_type = $2 AND status = 'ACTIVE' LIMIT 1",
      [user_id, user_type]
    );
    return result.rows[0] || null;
  }

  static async getTrustedContacts(user_id: string, user_type: 'driver' | 'user'): Promise<TrustedContact[]> {
    const result = await query(
      'SELECT * FROM trusted_contacts WHERE user_id = $1 AND user_type = $2',
      [user_id, user_type]
    );
    return result.rows;
  }

  static async addTrustedContact(user_id: string, user_type: 'driver' | 'user', name: string, phone: string, relationship?: string): Promise<TrustedContact> {
    const result = await query(
      'INSERT INTO trusted_contacts (user_id, user_type, name, phone, relationship) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, user_type, name, phone, relationship || null]
    );
    return result.rows[0];
  }

  static async removeTrustedContact(id: number, user_id: string): Promise<void> {
    await query(
      'DELETE FROM trusted_contacts WHERE id = $1 AND user_id = $2',
      [id, user_id]
    );
  }
}
