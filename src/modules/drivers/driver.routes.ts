import { Router } from 'express';
import { DriverController } from './driver.controller';
import {
  createDriverValidator,
  getDriverValidator,
  getDriversValidator,
  updateDriverValidator,
} from './driver.validator';
import { isAuthenticatedOrService } from '../../shared/serviceAuthentication';

const router = Router();

// ✅ PUBLIC — NEW DRIVER SIGNUP
router.post('/', createDriverValidator, DriverController.addDriver);

// 🔒 PROTECTED — TOKEN REQUIRED
router.use(isAuthenticatedOrService);

router.get('/', getDriversValidator, DriverController.getDrivers);
router.get('/:id', getDriverValidator, DriverController.getDriver);
router.put('/:id', updateDriverValidator, DriverController.updateDriver);

export default router;
