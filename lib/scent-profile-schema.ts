import { z } from "zod";

export const generatedScentProfileSchema = z.object({
  title: z.string().min(2).max(40),
  summary: z.string().min(30).max(220),
  scentTags: z.array(z.string().min(1).max(16)).min(3).max(6),
  emotionTags: z.array(z.string().min(1).max(16)).min(1).max(4),
  atmosphere: z.string().min(4).max(60),
  intensityLabel: z.string().min(2).max(24),
  price: z.number().int().min(99).max(299),
  productName: z.string().min(4).max(60),
  ritualSteps: z.array(z.string().min(10).max(72)).length(3),
  aiStages: z.array(z.string().min(4).max(40)).length(4),
  visualDescription: z.string().min(20).max(180),
  archiveNote: z.string().min(16).max(120),
});

export type GeneratedScentProfileSchema = z.infer<typeof generatedScentProfileSchema>;
