import { Request, Response, NextFunction } from 'express';
import { forwardRequest } from '../../shared/forwardRequest';
import config from '../../config';

export const S3Controller = {
  async generateUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    return forwardRequest(req, res, next, config.awsServiceUrl);
  },
};
