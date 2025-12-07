import { Request, Response } from 'express';
import { DriverDocumentsService } from './driver-documents.service';

export class DriverDocumentsController {
  static async getDriverDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { driverId } = req.params;
      const documents = await DriverDocumentsService.getDriverDocuments(driverId);
      res.status(200).json({ documents });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async uploadDocument(req: Request, res: Response): Promise<void> {
    try {
      const { driverId } = req.params;
      const { documentType, documentUrl } = req.body;

      const document = await DriverDocumentsService.uploadDocument(
        driverId,
        documentType,
        documentUrl
      );
      res.status(201).json({ document });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
