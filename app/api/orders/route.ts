import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const orderSchema = z.object({
  draft: z.object({
    narrative: z.string(),
    emotions: z.array(z.string()),
    generatedProfile: z.object({
      title: z.string(),
      summary: z.string(),
      scentTags: z.array(z.string()),
      emotionTags: z.array(z.string()),
      atmosphere: z.string(),
      intensityLabel: z.string(),
      price: z.number(),
      productName: z.string(),
      ritualSteps: z.array(z.string()),
      aiStages: z.array(z.string()),
      visualDescription: z.string(),
      archiveNote: z.string(),
      savedProfileId: z.string().optional(),
    }),
    image: z
      .object({
        name: z.string(),
        type: z.string(),
        dataUrl: z.string(),
      })
      .nullable(),
    feedback: z.string().nullable(),
    imagePath: z.string().nullable().optional(),
  }),
  contactEmail: z.string().email(),
  shippingAddress: z.object({
    email: z.string().email(),
    first_name: z.string(),
    last_name: z.string(),
    street: z.string(),
    city: z.string(),
    postal_code: z.string(),
    country: z.string(),
  }),
  paymentSummary: z.object({
    brand: z.string(),
    last4: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase environment is not configured." }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = orderSchema.parse(await request.json());
    let profileId = payload.draft.generatedProfile.savedProfileId ?? null;

    if (user && !profileId) {
      const { data: profileData, error: profileError } = await supabase
        .from("scent_profiles")
        .insert({
          user_id: user.id,
          title: payload.draft.generatedProfile.title,
          narrative: payload.draft.narrative,
          summary: payload.draft.generatedProfile.summary,
          emotion_tags: payload.draft.generatedProfile.emotionTags,
          scent_tags: payload.draft.generatedProfile.scentTags,
          image_path: payload.draft.imagePath ?? null,
          source_image_name: payload.draft.image?.name ?? null,
          profile_data: payload.draft.generatedProfile,
        })
        .select("id")
        .single();

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 400 });
      }

      profileId = profileData.id;
    }

    const { error } = await supabase.from("orders").insert({
      user_id: user?.id ?? null,
      profile_id: profileId,
      contact_email: payload.contactEmail,
      product_name: payload.draft.generatedProfile.productName,
      amount: payload.draft.generatedProfile.price + 18,
      status: "submitted",
      shipping_address: payload.shippingAddress,
      payment_summary: payload.paymentSummary,
      profile_snapshot: {
        narrative: payload.draft.narrative,
        emotions: payload.draft.emotions,
        generated_profile: payload.draft.generatedProfile,
        source_image_name: payload.draft.image?.name ?? null,
        image_path: payload.draft.imagePath ?? null,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, profileId });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "订单提交失败",
      },
      { status: 400 },
    );
  }
}
