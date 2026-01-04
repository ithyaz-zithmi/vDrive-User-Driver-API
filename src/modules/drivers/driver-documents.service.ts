import { DriverDocumentsRepository } from './driver-documents.repository';
import { DriverDocument, DocumentType, DocumentStatus } from './driver-documents.model';

export class DriverDocumentsService {
  static async getDriverDocuments(driverId: string): Promise<any[]> {
    const docs = await DriverDocumentsRepository.findByDriverId(driverId);
    return docs.map(this.formatDocument);
  }

  static async getDocumentById(id: string): Promise<any | null> {
    const doc = await DriverDocumentsRepository.findById(id);
    return doc ? this.formatDocument(doc) : null;
  }

  static async uploadDocument(
    driverId: string,
    documentType: string,
    documentData: Partial<DriverDocument>
  ): Promise<DriverDocument> {
    return await DriverDocumentsRepository.upsert(driverId, documentType, documentData);
  }

  static async verifyDocument(
    id: string,
    status: DocumentStatus,
    remarks?: string
  ): Promise<DriverDocument | null> {
    return await DriverDocumentsRepository.updateStatus(id, status, remarks);
  }

  static async deleteDocument(id: string): Promise<boolean> {
    return await DriverDocumentsRepository.delete(id);
  }

  private static formatDocument(doc: DriverDocument) {
    return {
      documentId: doc.id,
      driverId: doc.driver_id,
      documentType: doc.document_type,
      documentUrl: doc.document_url,
      status: doc.status,
      documentNumber: doc.metadata?.document_number || '',
      licenseStatus: doc.metadata?.license_status || '',
      expiryDate: doc.metadata?.expiry_date || '',
      uploadedAt: doc.uploaded_at,
      verifiedAt: doc.verified_at,
      remarks: doc.remarks,
    };
  }
}
