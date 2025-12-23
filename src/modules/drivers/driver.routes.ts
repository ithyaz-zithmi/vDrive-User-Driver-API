// src/modules/drivers/driver.routes.ts
import { Router } from 'express';
import { DriverController } from './driver.controller';
import { createDriverValidator, getDriverValidator, getDriversValidator, updateDriverValidator } from './driver.validator';

const router = Router();


router.post('/', DriverController.addDriver);


router.get('/', getDriversValidator, DriverController.getDrivers);

router.get('/:id', getDriverValidator, DriverController.getDriver);

router.put('/:id', updateDriverValidator, DriverController.updateDriver);

export default router;
