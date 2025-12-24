import { Router } from 'express';
import {
  createRechargePlan,
  getRechargePlans,
  editRechargePlan,
  toggleRechargePlanStatus,
  deleteRechargePlan,
} from './rechargePlan.controller';

const router = Router();

router.get('/', getRechargePlans);                     // Load table
router.post('/', createRechargePlan);                  // Create
router.put('/:id', editRechargePlan);                  // Edit
router.patch('/:id/status', toggleRechargePlanStatus); // Toggle Active/Inactive
router.delete('/:id', deleteRechargePlan);             // Delete

export default router;
