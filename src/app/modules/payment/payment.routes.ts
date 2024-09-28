import express from 'express';
import { PaymentController } from './payment.controller';
import auth from '../../middlewares/auth';
import { ENUM_USER_ROLE } from '../../../enums/user';
const bodyParser = require('body-parser');

const router = express.Router();

// router.post(
//     '/create-payment',
//     auth(ENUM_USER_ROLE.PATIENT),
//     PaymentController.createPaymentSession
// );

// Create Stripe payment session
router.post('/create-payment-session', auth(ENUM_USER_ROLE.PATIENT), PaymentController.createPaymentSession);

// Stripe webhook endpoint
router.post('/webhook', auth(ENUM_USER_ROLE.PATIENT), bodyParser.raw({ type: 'application/json' }), PaymentController.stripeWebhook);





export const paymentRoutes = router;

