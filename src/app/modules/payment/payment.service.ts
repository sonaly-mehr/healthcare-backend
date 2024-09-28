import prisma from "../../../shared/prisma";
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const createPaymentSession = async (appointmentId: string) => {
  try {
    // Fetch appointment details with the payment relation
    if (!appointmentId) {
      throw new Error("Appointment ID is required!");
    }
    const appointment = await prisma.appointment.findUnique({
      where: {
        id: appointmentId,  // Make sure you're passing a valid ID
      },
      include: {
        patient: true,
        payment: true, // Include payment relation here
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (!appointment.payment) {
      throw new Error('No payment record associated with this appointment');
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: appointment.patient.email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Appointment with Doctor ${appointment.doctorId}`,
          },
          unit_amount: Math.round(appointment.payment.amount * 100), // in cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-failed`,
      metadata: {
        appointmentId, // Add the appointment ID to the metadata
      },
    });

    // Save stripe session ID in payment record
    await prisma.payment.update({
      where: { appointmentId },
      data: {
        stripePaymentId: session.id,
        stripeCustomerId: session.customer,
      },
    });

    return session.url;
  } catch (error) {
    console.error('Error creating Stripe session:', error);
    throw error;
  }
};


const handleWebhook = async (event: any) => {
  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Fetch payment and mark as completed
      const payment = await prisma.payment.findUnique({
        where: { stripePaymentId: session.id },
      });

      if (payment) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        await prisma.appointment.update({
          where: { id: payment.appointmentId },
          data: { paymentStatus: 'COMPLETED' },
        });
      }
    }

    return { received: true };
  } catch (error) {
    console.error('Error processing webhook:', error);
    throw new Error('Webhook handling failed');
  }
};

export const PaymentService = {
  createPaymentSession,
  handleWebhook
}