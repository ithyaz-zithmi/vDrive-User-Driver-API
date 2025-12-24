import { Request, Response, NextFunction } from 'express';
import * as Plan from './rechargePlan.model';

export const createRechargePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await Plan.createPlan(req.body);
    res.status(201).json({
      message: 'Recharge plan created successfully',
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

export const getRechargePlans = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const plans = await Plan.getPlans();
    res.json({
      message: 'Recharge plans fetched successfully',
      data: plans,
    });
  } catch (err) {
    next(err);
  }
};

export const editRechargePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const plan = await Plan.updatePlan(Number(req.params.id), req.body);
    res.json({
      message: 'Recharge plan updated successfully',
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

export const toggleRechargePlanStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { isActive } = req.body;
    const plan = await Plan.toggleStatus(Number(req.params.id), isActive);
    res.json({
      message: 'Recharge plan status updated successfully',
      data: plan,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteRechargePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await Plan.deletePlan(Number(req.params.id));
    res.status(200).json({
      message: 'Recharge plan deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
