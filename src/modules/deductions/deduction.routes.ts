import { Router } from 'express';
import { DeductionController } from './deduction.controller';
import { createDeductionValidator, getDeductionsValidator, getDeductionByIdValidator } from './deduction.validator';

const router = Router();

// GET /api/deductions - Get all deductions and stats
router.get('/', getDeductionsValidator, DeductionController.getAllDeductions);

// POST /api/deductions - Create a new deduction
router.post('/', createDeductionValidator, DeductionController.createDeduction);

// GET /api/deductions/:id - Get a single deduction
router.get('/:id', getDeductionByIdValidator, DeductionController.getDeductionById);

export default router;
