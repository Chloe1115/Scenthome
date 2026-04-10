export type AppUser = {
  id: string;
  email: string | null;
} | null;

export type UploadedImage = {
  name: string;
  type: string;
  dataUrl: string;
};

export type GeneratedScentProfile = {
  title: string;
  summary: string;
  scentTags: string[];
  emotionTags: string[];
  atmosphere: string;
  intensityLabel: string;
  price: number;
  productName: string;
  ritualSteps: string[];
  aiStages: string[];
  visualDescription: string;
  archiveNote: string;
  savedProfileId?: string;
};

export type ScentDraft = {
  narrative: string;
  emotions: string[];
  image: UploadedImage | null;
  generatedProfile: GeneratedScentProfile | null;
  feedback: string | null;
  imagePath?: string | null;
};

export type PendingIntent = "save" | "purchase" | null;

export type ShippingFormValues = {
  email: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
};
