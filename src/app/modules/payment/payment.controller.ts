import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { PaymentService } from "./payment.service";
import sendResponse from "../../../shared/sendResponse";
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);


// Create Stripe payment session
const createPaymentSession = async (req:Request, res:Response) => {
  const { appointmentId } = req.body;

  try {
    const paymentUrl = await PaymentService.createPaymentSession(appointmentId);
    res.json({ url: paymentUrl });
  } catch (error) {
    console.error('Error in createPaymentSession controller:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Stripe webhook handler
const stripeWebhook = async (req:Request, res:Response) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    const response = await PaymentService.handleWebhook(event);

    res.json(response);
  } catch (error: any) {
    console.error('Error in stripeWebhook controller:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};



export const PaymentController = {
  createPaymentSession,
  stripeWebhook
};