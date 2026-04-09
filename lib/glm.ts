import { z } from "zod";

export const imageInsightSchema = z.object({
  summary: z.string().min(8).max(220),
  sceneType: z.string().min(1).max(40),
  keyObjects: z.array(z.string().min(1).max(24)).min(1).max(6),
  materials: z.array(z.string().min(1).max(24)).min(1).max(6),
  plants: z.array(z.string().min(1).max(24)).max(6),
  weather: z.string().min(1).max(40),
  lighting: z.string().min(1).max(40),
  mood: z.string().min(1).max(40),
  scentClues: z.array(z.string().min(1).max(24)).min(2).max(8),
});

export type ImageInsight = z.infer<typeof imageInsightSchema>;

const glmResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string(),
        }),
      }),
    )
    .min(1),
});

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

function normalizeImageInsight(raw: unknown) {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  return imageInsightSchema.parse({
    summary: String(input.summary ?? "图片中展示了一个可用于还原气味记忆的真实场景。").trim().slice(0, 220),
    sceneType: String(input.sceneType ?? "生活场景").trim().slice(0, 40),
    keyObjects: normalizeStringArray(input.keyObjects, ["建筑", "地面"], 1, 6),
    materials: normalizeStringArray(input.materials, ["木头", "泥土"], 1, 6),
    plants: normalizeStringArray(input.plants, [], 0, 6),
    weather: String(input.weather ?? "自然光").trim().slice(0, 40),
    lighting: String(input.lighting ?? "柔和").trim().slice(0, 40),
    mood: String(input.mood ?? "安静").trim().slice(0, 40),
    scentClues: normalizeStringArray(input.scentClues, ["木质", "泥土", "空气湿度"], 2, 8),
  });
}

export function getGLMApiKey() {
  return process.env.GLM_API_KEY || process.env.BIGMODEL_API_KEY || null;
}

export function getGLMModel() {
  return process.env.GLM_MODEL || "glm-4.6v-flash";
}

export async function analyzeImageWithGLM(imageDataUrl: string) {
  const apiKey = getGLMApiKey();

  if (!apiKey) {
    return null;
  }

  const response = await fetch("https://open.bigmodel.cn/api/paas/v4/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getGLMModel(),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageDataUrl,
              },
            },
            {
              type: "text",
              text: [
                "请分析这张图片，并输出 JSON，且只能输出 JSON，不要输出 markdown，不要输出解释。",
                "字段必须严格为：summary, sceneType, keyObjects, materials, plants, weather, lighting, mood, scentClues。",
                "要求：",
                "- 用中文",
                "- keyObjects 1到6个",
                "- materials 1到6个",
                "- plants 0到6个",
                "- scentClues 2到8个",
                "- scentClues 要偏向可联想到气味的线索，如木头、泥土、雨后空气、花叶、烟火气、海盐、旧纸张。",
              ].join("\n"),
            },
          ],
        },
      ],
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GLM 图片识别失败：${errorText}`);
  }

  const payload = glmResponseSchema.parse(await response.json());
  const rawContent = payload.choices[0].message.content;
  return normalizeImageInsight(JSON.parse(extractJsonObject(rawContent)));
}
