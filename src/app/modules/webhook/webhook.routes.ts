import express from 'express';
import WebhookController from './webhook.controller';


const router = express.Router();

// Route for handling Stripe webhooks
router.post('/stripe-webhook', WebhookController.handleStripeWebhook);

export const webhookRoutes = router;