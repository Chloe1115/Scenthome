import { z } from "zod";

export const ORDER_CURRENCY = "cny";
export const SHIPPING_FEE = 18;

export const generatedProfileSchema = z.object({
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
});

export const scentDraftSchema = z.object({
  narrative: z.string(),
  emotions: z.array(z.string()),
  generatedProfile: generatedProfileSchema,
  image: z
    .object({
      name: z.string(),
      type: z.string(),
      dataUrl: z.string(),
    })
    .nullable(),
  feedback: z.string().nullable(),
  imagePath: z.string().nullable().optional(),
});

export const shippingAddressSchema = z.object({
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  street: z.string(),
  city: z.string(),
  postal_code: z.string(),
  country: z.string(),
});

export const checkoutRequestSchema = z.object({
  draft: scentDraftSchema,
  contactEmail: z.string().email(),
  shippingAddress: shippingAddressSchema,
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

type StoredGeneratedProfile = z.infer<typeof generatedProfileSchema>;

export type StoredProfileSnapshot = {
  narrative: string;
  emotions: string[];
  generated_profile: StoredGeneratedProfile;
  source_image_name: string | null;
  image_path: string | null;
};

export function parseStoredProfileSnapshot(value: unknown): StoredProfileSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Partial<StoredProfileSnapshot> & {
    generated_profile?: Partial<StoredGeneratedProfile>;
  };

  if (
    typeof candidate.narrative !== "string" ||
    !Array.isArray(candidate.emotions) ||
    !candidate.emotions.every((emotion) => typeof emotion === "string") ||
    !candidate.generated_profile ||
    typeof candidate.generated_profile !== "object" ||
    typeof candidate.generated_profile.title !== "string" ||
    typeof candidate.generated_profile.summary !== "string" ||
    !Array.isArray(candidate.generated_profile.emotionTags) ||
    !Array.isArray(candidate.generated_profile.scentTags)
  ) {
    return null;
  }

  return candidate as StoredProfileSnapshot;
}

export function getOrderAmount(payload: CheckoutRequest) {
  return payload.draft.generatedProfile.price + SHIPPING_FEE;
}

export function toStripeAmount(value: number) {
  return Math.round(value * 100);
}

export function buildOrderProfileSnapshot(payload: CheckoutRequest): StoredProfileSnapshot {
  return {
    narrative: payload.draft.narrative,
    emotions: payload.draft.emotions,
    generated_profile: payload.draft.generatedProfile,
    source_image_name: payload.draft.image?.name ?? null,
    image_path: payload.draft.imagePath ?? null,
  };
}
