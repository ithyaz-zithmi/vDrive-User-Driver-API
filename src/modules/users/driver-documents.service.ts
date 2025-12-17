import { DriverDocumentsRepository } from './driver-documents.repository';
import { DriverDocument, DocumentType, DocumentStatus } from './driver-documents.model';

export class DriverDocumentsService {
  static async getDriverDocuments(driverId: string): Promise<DriverDocument[]> {
    return await DriverDocumentsRepository.findByDriverId(driverId);
  }

  static async getDocumentById(id: string): Promise<DriverDocument | null> {
    return await DriverDocumentsRepository.findById(id);
  }

  static async uploadDocument(
    driverId: string,
    documentType: DocumentType,
    documentUrl: string
  ): Promise<DriverDocument> {
    return await DriverDocumentsRepository.upsert(driverId, documentType, documentUrl);
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
}
