import { Request, Response, NextFunction } from 'express';
import { RechargePlanService } from './rechargePlan.service';

export const RechargePlanController = {

 
  async getRechargePlans(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;

      const { plans, total } = await RechargePlanService.getPlans(page, limit);
      const totalPages = Math.ceil(total / limit);

      return res.status(200).json({
        message: "Recharge plans fetched successfully",
        data: plans,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  },

  async getRechargePlanById(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await RechargePlanService.getPlanById(Number(req.params.id));
      return res.status(200).json({
        message: "Recharge plan fetched successfully",
        data: plan
      });
    } catch (err) {
      next(err);
    }
  },
  
  async createRechargePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await RechargePlanService.createPlan(req.body);
      return res.status(201).json({
        message: "Recharge plan created successfully",
        data: plan
      });
    } catch (err) {
      next(err);
    }
  },

  
  async editRechargePlan(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await RechargePlanService.updatePlan(Number(req.params.id), req.body);
      return res.status(200).json({
        message: "Recharge plan updated successfully",
        data: plan
      });
    } catch (err) {
      next(err);
    }
  },

  
  async toggleRechargePlanStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.body;
      const plan = await RechargePlanService.toggleStatus(Number(req.params.id), isActive);
      return res.status(200).json({
        message: "Recharge plan status updated successfully",
        data: plan
      });
    } catch (err) {
      next(err);
    }
  },


  async deleteRechargePlan(req: Request, res: Response, next: NextFunction) {
    try {
      await RechargePlanService.deletePlan(Number(req.params.id));
      return res.status(200).json({
        message: "Recharge plan deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  },
};
