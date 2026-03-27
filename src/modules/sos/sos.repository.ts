import { query } from '../../shared/database';
import { SosEvent, SosLocation, TrustedContact } from './sos.model';

export class SosRepository {
  static async createSosEvent(driver_id: string, trip_id?: string): Promise<SosEvent> {
    const result = await query(
      'INSERT INTO sos_events (driver_id, trip_id, status) VALUES ($1, $2, $3) RETURNING *',
      [driver_id, trip_id, 'ACTIVE']
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

  static async findActiveSosByDriver(driver_id: string): Promise<SosEvent | null> {
    const result = await query(
      "SELECT * FROM sos_events WHERE driver_id = $1 AND status = 'ACTIVE' LIMIT 1",
      [driver_id]
    );
    return result.rows[0] || null;
  }

  static async getTrustedContacts(driver_id: string): Promise<TrustedContact[]> {
    const result = await query(
      'SELECT * FROM trusted_contacts WHERE driver_id = $1',
      [driver_id]
    );
    return result.rows;
  }

  static async addTrustedContact(driver_id: string, name: string, phone: string): Promise<TrustedContact> {
    const result = await query(
      'INSERT INTO trusted_contacts (driver_id, name, phone) VALUES ($1, $2, $3) RETURNING *',
      [driver_id, name, phone]
    );
    return result.rows[0];
  }

  static async removeTrustedContact(id: number, driver_id: string): Promise<void> {
    await query(
      'DELETE FROM trusted_contacts WHERE id = $1 AND driver_id = $2',
      [id, driver_id]
    );
  }
}
