import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const feedbackSchema = z.object({
  feedbackValue: z.string().min(1),
  profileId: z.string().nullable().optional(),
  profileTitle: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const payload = feedbackSchema.parse(await request.json());

    if (!supabase) {
      return NextResponse.json({ ok: true, mode: "local" });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase.from("profile_feedback").insert({
      user_id: user?.id ?? null,
      profile_id: payload.profileId ?? null,
      feedback_value: payload.feedbackValue,
      metadata: {
        profile_title: payload.profileTitle ?? null,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "反馈提交失败",
      },
      { status: 400 },
    );
  }
}
