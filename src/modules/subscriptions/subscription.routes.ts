import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { createOrderValidator, verifyPaymentValidator } from './subscription.validator';

const router = Router();

router.post('/create-order', createOrderValidator, SubscriptionController.createOrder);
router.post('/verify-payment', verifyPaymentValidator, SubscriptionController.verifyPayment);
router.get('/my-subscription', SubscriptionController.getMySubscription);
router.get('/all-active', SubscriptionController.getAllActiveSubscriptions);
router.get('/', SubscriptionController.getAllPlans);

export default router;
