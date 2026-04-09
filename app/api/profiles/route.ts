import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  draft: z.object({
    narrative: z.string(),
    emotions: z.array(z.string()),
    image: z
      .object({
        name: z.string(),
        type: z.string(),
        dataUrl: z.string(),
      })
      .nullable(),
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
    feedback: z.string().nullable(),
    imagePath: z.string().nullable().optional(),
  }),
  imagePath: z.string().nullable(),
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

    if (!user) {
      return NextResponse.json({ error: "请先登录后再保存方案。" }, { status: 401 });
    }

    const payload = profileSchema.parse(await request.json());
    const profile = payload.draft.generatedProfile;

    const { data, error } = await supabase
      .from("scent_profiles")
      .insert({
        user_id: user.id,
        title: profile.title,
        narrative: payload.draft.narrative,
        summary: profile.summary,
        emotion_tags: profile.emotionTags,
        scent_tags: profile.scentTags,
        image_path: payload.imagePath,
        source_image_name: payload.draft.image?.name ?? null,
        profile_data: profile,
      })
      .select("id")
      .single();

    if (error) {
      return NextResponse.json(
        {
          error: `保存失败：${error.message}`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "保存失败",
      },
      { status: 400 },
    );
  }
}
