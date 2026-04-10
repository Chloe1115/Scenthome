import { NextResponse } from "next/server";

import { buildOrderProfileSnapshot, checkoutRequestSchema, getOrderAmount, ORDER_CURRENCY, SHIPPING_FEE, toStripeAmount } from "@/lib/orders";
import { confirmStripeCheckoutSession } from "@/lib/stripe-order";
import { createStripeClient, getRequestBaseUrl } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const stripe = createStripeClient();
    const adminClient = createSupabaseAdminClient();
    const supabase = await createSupabaseServerClient();

    if (!stripe || !adminClient || !supabase) {
      return NextResponse.json(
        { error: "Stripe or Supabase server configuration is missing." },
        { status: 500 },
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = checkoutRequestSchema.parse(await request.json());
    const amount = getOrderAmount(payload);
    const baseUrl = getRequestBaseUrl(request);

    const { data: pendingOrder, error: orderError } = await adminClient
      .from("orders")
      .insert({
        user_id: user?.id ?? null,
        profile_id: payload.draft.generatedProfile.savedProfileId ?? null,
        product_name: payload.draft.generatedProfile.productName,
        amount,
        status: "pending_payment",
        shipping_address: payload.shippingAddress,
        payment_summary: {
          provider: "stripe",
          payment_status: "pending",
          customer_email: payload.contactEmail,
        },
        profile_snapshot: buildOrderProfileSnapshot(payload),
      })
      .select("id")
      .single();

    if (orderError || !pendingOrder) {
      return NextResponse.json({ error: orderError?.message ?? "Unable to create pending order." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_creation: "always",
      customer_email: payload.contactEmail,
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout?canceled=1`,
      client_reference_id: pendingOrder.id,
      metadata: {
        pending_order_id: pendingOrder.id,
      },
      payment_intent_data: {
        metadata: {
          pending_order_id: pendingOrder.id,
        },
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: ORDER_CURRENCY,
            unit_amount: toStripeAmount(payload.draft.generatedProfile.price),
            product_data: {
              name: payload.draft.generatedProfile.productName,
              description: payload.draft.generatedProfile.summary,
            },
          },
        },
        {
          quantity: 1,
          price_data: {
            currency: ORDER_CURRENCY,
            unit_amount: toStripeAmount(SHIPPING_FEE),
            product_data: {
              name: "Shipping",
            },
          },
        },
      ],
    });

    await adminClient
      .from("orders")
      .update({
        payment_summary: {
          provider: "stripe",
          payment_status: "pending",
          checkout_session_id: session.id,
          checkout_url: session.url,
        },
      })
      .eq("id", pendingOrder.id);

    if (!session.url) {
      return NextResponse.json({ error: "Stripe Checkout URL was not returned." }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create Stripe Checkout Session.",
      },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  try {
    const sessionId = new URL(request.url).searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
    }

    const result = await confirmStripeCheckoutSession(sessionId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to confirm Stripe Checkout Session.",
      },
      { status: 400 },
    );
  }
}
