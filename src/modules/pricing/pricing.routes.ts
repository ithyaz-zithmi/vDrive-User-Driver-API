import { Router } from 'express';
import { PricingController } from './pricing.controller';

const router = Router();

router.post('/calculate-all-types', PricingController.calculateAllTypes);

export default router;
