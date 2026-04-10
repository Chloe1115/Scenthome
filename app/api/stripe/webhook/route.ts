import { NextResponse } from "next/server";

import { confirmStripeCheckoutSession, constructStripeWebhookEvent } from "@/lib/stripe-order";

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");
    const event = await constructStripeWebhookEvent(payload, signature);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        await confirmStripeCheckoutSession(session.id);
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process Stripe webhook.",
      },
      { status: 400 },
    );
  }
}
