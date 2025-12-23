import { query } from '../../shared/database';
import { DriverDocument, DocumentType, DocumentStatus } from './driver-documents.model';

export const DriverDocumentsRepository = {
  async findByDriverId(driverId: string): Promise<DriverDocument[]> {
    const sqlQuery = `
      SELECT id, driver_id, document_type, document_url, status, uploaded_at, verified_at, remarks
      FROM driver_documents
      WHERE driver_id = $1
    `;
    const result = await query(sqlQuery, [driverId]);
    return result.rows as DriverDocument[];
  },

  async findById(id: string): Promise<DriverDocument | null> {
    const sqlQuery = `
      SELECT id, driver_id, document_type, document_url, status, uploaded_at, verified_at, remarks
      FROM driver_documents
      WHERE id = $1
    `;
    const result = await query(sqlQuery, [id]);
    return (result.rows[0] as DriverDocument) || null;
  },

  async insert(document: Omit<DriverDocument, 'id' | 'uploaded_at'>): Promise<DriverDocument> {
    const sqlQuery = `
      INSERT INTO driver_documents (driver_id, document_type, document_url, status, remarks)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, driver_id, document_type, document_url, status, uploaded_at, verified_at, remarks
    `;
    const result = await query(sqlQuery, [
      document.driver_id,
      document.document_type,
      document.document_url || null,
      document.status,
      document.remarks || null,
    ]);
    return result.rows[0] as DriverDocument;
  },

  async updateStatus(
    id: string,
    status: DocumentStatus,
    remarks?: string
  ): Promise<DriverDocument | null> {
    const sqlQuery = `
      UPDATE driver_documents
      SET status = $2, verified_at = CURRENT_TIMESTAMP, remarks = $3
      WHERE id = $1
      RETURNING id, driver_id, document_type, document_url, status, uploaded_at, verified_at, remarks
    `;
    const result = await query(sqlQuery, [id, status, remarks || null]);
    return (result.rows[0] as DriverDocument) || null;
  },

  async upsert(
    driverId: string,
    documentType: DocumentType,
    documentUrl: string
  ): Promise<DriverDocument> {
    const sqlQuery = `
      INSERT INTO driver_documents (driver_id, document_type, document_url, status)
      VALUES ($1, $2, $3, 'pending')
      ON CONFLICT (driver_id, document_type)
      DO UPDATE SET document_url = EXCLUDED.document_url, uploaded_at = CURRENT_TIMESTAMP
      RETURNING id, driver_id, document_type, document_url, status, uploaded_at, verified_at, remarks
    `;
    const result = await query(sqlQuery, [driverId, documentType, documentUrl]);
    return result.rows[0] as DriverDocument;
  },

  async delete(id: string): Promise<boolean> {
    const sqlQuery = 'DELETE FROM driver_documents WHERE id = $1';
    const result = await query(sqlQuery, [id]);
    return (result.rowCount || 0) > 0;
  },
};
