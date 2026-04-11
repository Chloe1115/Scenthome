import type Stripe from "stripe";

import { parseStoredProfileSnapshot, type StoredProfileSnapshot } from "@/lib/orders";
import { createStripeClient } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type StoredOrderRecord = {
  id: string;
  user_id: string | null;
  profile_id: string | null;
  status: string;
  payment_summary: Record<string, unknown> | null;
  profile_snapshot?: StoredProfileSnapshot | null;
};

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isMissingColumnError(error: { message?: string | null } | null | undefined, column: string) {
  return Boolean(error?.message?.includes(`Could not find the '${column}' column`));
}

export async function confirmStripeCheckoutSession(sessionId: string) {
  const stripe = createStripeClient();
  const adminClient = createSupabaseAdminClient();

  if (!stripe || !adminClient) {
    throw new Error("Stripe or Supabase server configuration is missing.");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent.payment_method"],
  });

  const pendingOrderId = session.metadata?.pending_order_id ?? session.client_reference_id;

  if (!pendingOrderId) {
    throw new Error("Stripe session is missing the pending order reference.");
  }

  let orderResult = await adminClient
    .from("orders")
    .select("id, user_id, profile_id, status, payment_summary, profile_snapshot")
    .eq("id", pendingOrderId)
    .single();

  if (isMissingColumnError(orderResult.error, "profile_snapshot")) {
    orderResult = await adminClient
      .from("orders")
      .select("id, user_id, profile_id, status, payment_summary")
      .eq("id", pendingOrderId)
      .single();
  }

  if (orderResult.error || !orderResult.data) {
    throw new Error(orderResult.error?.message ?? "Pending order not found.");
  }

  const storedOrder = orderResult.data as StoredOrderRecord;
  const paymentSummary = asObject(storedOrder.payment_summary);
  const snapshot =
    parseStoredProfileSnapshot(storedOrder.profile_snapshot) ??
    parseStoredProfileSnapshot(paymentSummary.profile_snapshot);

  if (session.payment_status !== "paid") {
    return {
      status: storedOrder.status,
      paymentStatus: session.payment_status,
      orderId: storedOrder.id,
      email: session.customer_details?.email ?? null,
    };
  }

  let profileId = storedOrder.profile_id;

  if (!profileId && storedOrder.user_id && snapshot) {
    const savedProfileId =
      snapshot.generated_profile &&
      typeof snapshot.generated_profile.savedProfileId === "string" &&
      snapshot.generated_profile.savedProfileId.length > 0
        ? snapshot.generated_profile.savedProfileId
        : null;

    if (savedProfileId) {
      profileId = savedProfileId;
    } else {
      const { data: profileData, error: profileError } = await adminClient
        .from("scent_profiles")
        .insert({
          user_id: storedOrder.user_id,
          title: snapshot.generated_profile.title,
          narrative: snapshot.narrative,
          summary: snapshot.generated_profile.summary,
          emotion_tags: snapshot.generated_profile.emotionTags,
          scent_tags: snapshot.generated_profile.scentTags,
          image_path: snapshot.image_path ?? null,
          source_image_name: snapshot.source_image_name ?? null,
          profile_data: snapshot.generated_profile,
        })
        .select("id")
        .single();

      if (profileError) {
        throw new Error(profileError.message);
      }

      profileId = profileData.id;
    }
  }

  const paymentIntent =
    session.payment_intent && typeof session.payment_intent !== "string" ? session.payment_intent : null;
  const paymentMethod =
    paymentIntent?.payment_method && typeof paymentIntent.payment_method !== "string"
      ? paymentIntent.payment_method
      : null;
  const cardDetails = paymentMethod?.type === "card" ? paymentMethod.card : null;
  if (storedOrder.status !== "paid") {
    const { error: updateError } = await adminClient
      .from("orders")
      .update({
        profile_id: profileId,
        status: "paid",
        payment_summary: {
          ...paymentSummary,
          provider: "stripe",
          payment_status: session.payment_status,
          customer_email: session.customer_details?.email ?? null,
          checkout_session_id: session.id,
          payment_intent_id: paymentIntent?.id ?? null,
          customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          brand: cardDetails?.brand ?? null,
          last4: cardDetails?.last4 ?? null,
        },
      })
      .eq("id", storedOrder.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return {
    status: "paid",
    paymentStatus: session.payment_status,
    orderId: storedOrder.id,
    email: session.customer_details?.email ?? null,
  };
}

export async function constructStripeWebhookEvent(payload: string, signature: string | null) {
  const stripe = createStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret || !signature) {
    throw new Error("Stripe webhook configuration is missing.");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
