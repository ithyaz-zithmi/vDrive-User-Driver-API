// src/modules/deductions/deduction.controller.ts
import { Request, Response, NextFunction } from 'express';
import { successResponse } from '../../shared/errorHandler';
import { DeductionService } from './deduction.service';

export const DeductionController = {
  async getAllDeductions(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, status, type } = req.query;
      const result = await DeductionService.getAllDeductions({
        search: search as string,
        status: status as string,
        type: type as string
      });

      return successResponse(res, 200, 'Deductions fetched successfully', result);
    } catch (error: any) {
      next(error);
    }
  },

  async createDeduction(req: Request, res: Response, next: NextFunction) {
    try {
      const { driver, amount, trip, type, balanceBefore, balanceAfter, status, reference, performedBy } = req.body;
      
      // Basic formatting of currency strings to numbers if they come as strings like "$125.50"
      const parseCurrency = (val: any) => typeof val === 'string' ? parseFloat(val.replace(/[$,]/g, '')) : val;

      const newDeduction = await DeductionService.createDeduction({
        driverId: driver?.id,
        driverName: driver?.fullName,
        driverPhone: driver?.phone,
        amount: parseCurrency(amount),
        tripId: trip,
        type,
        balanceBefore: parseCurrency(balanceBefore),
        balanceAfter: parseCurrency(balanceAfter),
        status,
        reference,
        performedBy
      });

      return successResponse(res, 201, 'Deduction created successfully', newDeduction);
    } catch (error: any) {
      next(error);
    }
  },

  async getDeductionById(req: Request, res: Response, next: NextFunction) {
    try {
      const deduction = await DeductionService.getDeductionById(req.params.id);
      if (!deduction) {
          const error: any = new Error("Deduction not found");
          error.status = 404;
          throw error;
      }
      return successResponse(res, 200, 'Deduction fetched successfully', deduction);
    } catch (error: any) {
      next(error);
    }
  },
};
