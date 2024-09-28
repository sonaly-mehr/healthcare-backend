import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import WebhookService from './webhook.services';

// Load your Stripe secret key from the environment variable
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20', // Make sure the API version matches your Stripe account's version
});

class WebhookController {
  static async handleStripeWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const sig = req.headers['stripe-signature'] as string; // Signature sent by Stripe
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string; // Your Stripe webhook secret

      let event: Stripe.Event;

      // Verify the webhook signature to ensure the request is legitimate
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      // Pass the verified event to the service layer for processing
      await WebhookService.processStripeEvent(event);

      // Respond with success if the webhook is processed without errors
      res.json({ received: true });
    } catch (error) {
      next(error);
    }
  }
}

export default WebhookController;