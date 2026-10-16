import Stripe from "stripe";
import { config } from "./config.js";

export const stripe = config.stripe.secretKey ? new Stripe(config.stripe.secretKey) : null;

export async function createRunPaymentIntent(
  customerId: string | null,
  email: string,
  runId: string,
  amountCents: number,
): Promise<Stripe.PaymentIntent> {
  if (!stripe) throw new Error("Stripe is not configured");
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: "usd",
    customer: customerId ?? undefined,
    receipt_email: email,
    metadata: { livlyf_run_id: runId },
    automatic_payment_methods: { enabled: true },
  });
}
