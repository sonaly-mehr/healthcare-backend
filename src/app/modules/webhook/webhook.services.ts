
import Stripe from 'stripe';
import prisma from '../../../shared/prisma';

class WebhookService {
  static async processStripeEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await WebhookService.handlePaymentSuccess(paymentIntent);
        break;

      case 'payment_intent.payment_failed':
        const failedIntent = event.data.object as Stripe.PaymentIntent;
        await WebhookService.handlePaymentFailure(failedIntent);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
    // Extract relevant data from the payment intent
    const { id, amount, metadata } = paymentIntent;
    const appointmentId = metadata.appointmentId as string;

    // Update payment status in the database
    await prisma.payment.update({
      where: { stripePaymentId: id },
      data: { status: 'COMPLETED' }, // Ensure this status exists in your PaymentStatus enum
    });

    console.log(`Payment successful for appointment ${appointmentId}`);
  }

  static async handlePaymentFailure(paymentIntent: Stripe.PaymentIntent) {
    const { id } = paymentIntent;

    // Update the payment record to reflect failure
    await prisma.payment.update({
      where: { stripePaymentId: id },
      data: { status: 'FAILED' }, // Ensure this status exists in your PaymentStatus enum
    });

    console.log(`Payment failed for PaymentIntent ${id}`);
  }
}

export default WebhookService;