import { NextResponse } from "next/server";
import { z } from "zod";

import { analyzeImageWithGLM } from "@/lib/glm";
import { getMiniMaxClient, getMiniMaxModel } from "@/lib/minimax";
import { generatedScentProfileSchema } from "@/lib/scent-profile-schema";

const synthesizeSchema = z.object({
  narrative: z.string().default(""),
  emotions: z.array(z.string()).default([]),
  image: z
    .object({
      name: z.string(),
      type: z.string(),
      dataUrl: z.string(),
    })
    .nullable()
    .optional(),
});

const defaultAiStages = [
  "记忆线索提取中",
  "图片与场景要素识别中",
  "情绪权重校准中",
  "专属香气方案生成中",
];

function extractPureBase64(dataUrl: string) {
  const [, encoded] = dataUrl.split(",", 2);
  return encoded ?? dataUrl;
}

function extractJsonObject(rawText: string) {
  const cleaned = rawText
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return cleaned;
  }

  return cleaned.slice(firstBrace, lastBrace + 1);
}

function normalizeStringArray(value: unknown, fallback: string[], min: number, max: number) {
  if (!Array.isArray(value)) {
    return fallback.slice(0, max);
  }

  const cleaned = value
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, max);

  return cleaned.length >= min ? cleaned : fallback.slice(0, max);
}

function normalizeProfile(raw: unknown, emotions: string[]) {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const fallbackEmotions = emotions.length > 0 ? emotions : ["怀旧"];
  const parsedPrice = Number(String(input.price ?? "").replace(/[^\d]/g, ""));
  const normalized = {
    title: String(input.title ?? "故乡记忆香气方案").trim().slice(0, 40),
    summary: String(input.summary ?? "这支香气围绕熟悉的场景、空气温度与旧日情绪展开，像一段被慢慢重新看见的故乡片段。")
      .trim()
      .slice(0, 220),
    scentTags: normalizeStringArray(input.scentTags, ["木质", "花香", "泥土"], 3, 6),
    emotionTags: normalizeStringArray(input.emotionTags, fallbackEmotions, 1, 4),
    atmosphere: String(input.atmosphere ?? "温柔、安静、带一点旧时光的暖意").trim().slice(0, 60),
    intensityLabel: String(input.intensityLabel ?? "柔和细腻").trim().slice(0, 24),
    price: Number.isFinite(parsedPrice) && parsedPrice >= 99 && parsedPrice <= 299 ? parsedPrice : 168,
    productName: String(input.productName ?? "故乡记忆定制香气套组").trim().slice(0, 60),
    ritualSteps: normalizeStringArray(
      input.ritualSteps,
      [
        "第一步：前调先透出最轻的一层气息，像场景刚刚被风推开。",
        "第二步：中调慢慢铺开，空气、光线和人物的距离都变得更近。",
        "第三步：后调安静留下，余味贴得更近，也停得更久一些。",
      ],
      3,
      3,
    ),
    aiStages: normalizeStringArray(input.aiStages, defaultAiStages, 4, 4),
    visualDescription: String(
      input.visualDescription ?? "画面里有熟悉的光线、旧物材质和空气湿度，整体像一段被重新点亮的故乡片段。",
    )
      .trim()
      .slice(0, 180),
    archiveNote: String(
      input.archiveNote ?? "整支方案会先亮一下，再慢慢安静下来，最后留下更长的回味和空气感。",
    )
      .trim()
      .slice(0, 120),
  };

  return generatedScentProfileSchema.parse(normalized);
}

export async function POST(request: Request) {
  try {
    const payload = synthesizeSchema.parse(await request.json());

    if (!payload.narrative.trim() && !payload.image?.dataUrl) {
      return NextResponse.json(
        {
          error: "请至少提供一段记忆文字，或上传一张图片。",
        },
        { status: 400 },
      );
    }

    const client = getMiniMaxClient();
    let imageInsight = null;
    let imageAnalysisMode: "glm" | "fallback" | "none" = "none";
    let imageAnalysisNote: string | null = null;

    if (payload.image?.dataUrl) {
      try {
        imageInsight = await analyzeImageWithGLM(payload.image.dataUrl);
        imageAnalysisMode = "glm";
      } catch (error) {
        imageAnalysisMode = "fallback";
        imageAnalysisNote =
          error instanceof Error
            ? `GLM 识图未成功，已自动回退到备用模式继续生成：${error.message}`
            : "GLM 识图未成功，已自动回退到备用模式继续生成。";
      }
    }

    if (!client) {
      return NextResponse.json(
        {
          error:
            "还没有配置 MINIMAX_API_KEY，所以现在无法用 MiniMax 生成方案。请先把 MiniMax key 加到 .env.local，再重启项目。",
        },
        { status: 500 },
      );
    }

    const promptSections = [
      "你是乡忆 ScentHome 的气味策展 AI。",
      "请根据用户提供的中文记忆描述、情绪标签，以及图片线索，生成一个适合网页展示与购买的香气方案。",
      "输出必须是 JSON，且只能输出 JSON，不要输出 markdown，不要输出解释。",
      "JSON 字段必须严格为：title, summary, scentTags, emotionTags, atmosphere, intensityLabel, price, productName, ritualSteps, aiStages, visualDescription, archiveNote。",
      "字段要求：",
      "- title: 2到40字",
      "- summary: 30到220字",
      "- scentTags: 3到6个标签数组",
      "- emotionTags: 1到4个标签数组",
      "- atmosphere: 4到60字",
      "- intensityLabel: 2到24字",
      "- price: 99到299之间的整数",
      "- productName: 4到60字",
      "- ritualSteps: 3条字符串数组，每条控制在 18 到 42 个字内",
      "- aiStages: 4条字符串数组",
      "- visualDescription: 20到180字",
      "- archiveNote: 16到120字",
      "- emotionTags 最多 4 个",
      "- scentTags 最多 6 个",
      "- ritualSteps 必须严格只有 3 条",
      "- aiStages 必须严格只有 4 条数组，不要返回对象",
      "- price 必须是数字，不要加引号，不要带货币符号",
      "风格要温柔、具体、有场景感，像在描述气味和画面，不要写技术黑话。",
      "ritualSteps 的 3 条不是使用说明，也不是营销文案，而是三段氛围文字。",
      "每一条 ritualSteps 都要像在描写香气如何一步步出现，让人读到文字就能想象气味。",
      "ritualSteps 要像三段短短的气味画面，不要太短到只剩标签，也不要长成说明文。",
      "可以写前调、中调、后调，但不要写清晨、午后、傍晚怎么使用，不要写适合什么人，不要写购买引导。",
      "避免出现这些词或类似表达：唤起用户、沉浸体验、治愈人心、营销、购买转化、专属定制、疗愈、爆款。",
      "避免命令式语气，不要写‘请感受’、‘先闻’、‘使用时’、‘建议在’这类指导语。",
      `用户情绪标签：${payload.emotions.length > 0 ? payload.emotions.join("、") : "未选择"}`,
    ];

    if (payload.narrative.trim()) {
      promptSections.push(`用户记忆：${payload.narrative}`);
    } else {
      promptSections.push(
        "用户没有提供记忆文字，请主要依据图片识别结果推断场景，并生成更偏场景导向的香气方案。",
      );
    }

    if (imageInsight && payload.image) {
      promptSections.push(
        `用户上传图片名称：${payload.image.name}`,
        `用户上传图片类型：${payload.image.type}`,
        "以下是视觉模型对图片的结构化识别结果，请把这些线索融合进香气方案：",
        JSON.stringify(imageInsight, null, 2),
      );
    } else if (payload.image?.dataUrl) {
      promptSections.push(
        "用户上传了图片，但当前这张图片未能完成结构化识别。",
        "请仅根据用户记忆文本和情绪标签生成方案，同时保留一点开放性，不要强行编造图片内容。",
      );
    } else {
      promptSections.push("本次没有上传图片。");
    }

    const prompt = promptSections.join("\n");

    const response = await client.chat.completions.create({
      model: getMiniMaxModel(),
      messages: [
        {
          role: "system",
          content:
            "你是一个只输出 JSON 的香气方案生成器。你的中文表达要克制、自然、偏文学感，只描写气味、场景和余味，不写营销话术。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
    });

    const rawContent = response.choices[0]?.message?.content;

    if (!rawContent) {
      throw new Error("MiniMax 没有返回有效内容，请稍后再试。");
    }

    const profile = normalizeProfile(JSON.parse(extractJsonObject(rawContent)), payload.emotions);

    return NextResponse.json({
      profile,
      imageInsightUsed: imageAnalysisMode === "glm",
      imageAnalysisMode,
      imageAnalysisNote,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "生成失败",
      },
      { status: 400 },
    );
  }
}
