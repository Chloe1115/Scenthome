"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { EMOTION_OPTIONS, FEEDBACK_OPTIONS } from "@/lib/constants";
import {
  clearPendingIntent,
  readDraftFromSession,
  saveDraftToSession,
  setPendingIntent,
} from "@/lib/client-draft";
import { MotionReveal } from "@/components/motion-reveal";
import { MultisensoryExperience } from "@/components/multisensory-experience";
import { PurchaseSheet } from "@/components/purchase-sheet";
import { SignOutButton } from "@/components/sign-out-button";
import { primeImmersiveAudio } from "@/lib/immersive-audio";
import { deriveExperiencePlan } from "@/lib/multisensory";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppUser, GeneratedScentProfile, ScentDraft, UploadedImage } from "@/lib/types";
import { cn, formatPrice, readAsDataUrl, slugify } from "@/lib/utils";

type HomePageProps = {
  initialUser: AppUser;
  initialIsAdmin: boolean;
};

type MessageState = {
  type: "success" | "error" | "info";
  text: string;
} | null;

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

function buildDraft({
  narrative,
  emotions,
  image,
  generatedProfile,
  feedback,
  imagePath,
}: {
  narrative: string;
  emotions: string[];
  image: UploadedImage | null;
  generatedProfile: GeneratedScentProfile | null;
  feedback: string | null;
  imagePath?: string | null;
}): ScentDraft {
  return {
    narrative,
    emotions,
    image,
    generatedProfile,
    feedback,
    imagePath: imagePath ?? null,
  };
}

async function uploadDraftImage(userId: string, image: UploadedImage | null, currentPath?: string | null) {
  if (!image) {
    return null;
  }

  if (currentPath) {
    return currentPath;
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const blob = await fetch(image.dataUrl).then((response) => response.blob());
  const extension = image.type.split("/")[1] || "png";
  const path = `${userId}/${Date.now()}-${slugify(image.name || "memory-image")}.${extension}`;
  const { error } = await supabase.storage.from("memory-images").upload(path, blob, {
    contentType: image.type,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return path;
}

export function HomePage({ initialUser, initialIsAdmin }: HomePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const autoSaveTriggeredRef = useRef(false);
  const generatingSectionRef = useRef<HTMLElement | null>(null);
  const resultSectionRef = useRef<HTMLElement | null>(null);
  const feedbackSectionRef = useRef<HTMLElement | null>(null);

  const [currentUser, setCurrentUser] = useState<AppUser>(initialUser);
  const [narrative, setNarrative] = useState("");
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>(["怀旧"]);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [generatedProfile, setGeneratedProfile] = useState<GeneratedScentProfile | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "generating" | "result">("idle");
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<MessageState>(null);
  const [experienceOpen, setExperienceOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [experienceCompleted, setExperienceCompleted] = useState(false);
  const [intensity, setIntensity] = useState(6);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [purchaseSheetOpen, setPurchaseSheetOpen] = useState(false);
  const [isNavigatingToCheckout, setIsNavigatingToCheckout] = useState(false);

  const canGenerate = narrative.trim().length > 0 || Boolean(uploadedImage);
  const isAdmin = Boolean(currentUser?.email && initialIsAdmin && currentUser.email === initialUser?.email);
  const currentDraft = useMemo(
    () =>
      buildDraft({
        narrative,
        emotions: selectedEmotions,
        image: uploadedImage,
        generatedProfile,
        feedback,
        imagePath,
      }),
    [feedback, generatedProfile, imagePath, narrative, selectedEmotions, uploadedImage],
  );
  const experiencePlan = useMemo(
    () => (generatedProfile ? deriveExperiencePlan(generatedProfile, narrative, selectedEmotions) : null),
    [generatedProfile, narrative, selectedEmotions],
  );

  useEffect(() => {
    const storedDraft = readDraftFromSession();

    if (!storedDraft) {
      return;
    }

    setNarrative(storedDraft.narrative);
    setSelectedEmotions(storedDraft.emotions.length > 0 ? storedDraft.emotions : ["怀旧"]);
    setUploadedImage(storedDraft.image);
    setGeneratedProfile(storedDraft.generatedProfile);
    setFeedback(storedDraft.feedback);
    setImagePath(storedDraft.imagePath ?? null);
    if (storedDraft.generatedProfile) {
      setPhase("result");
    }
  }, []);

  useEffect(() => {
    saveDraftToSession(currentDraft);
  }, [currentDraft]);

  useEffect(() => {
    if (phase !== "generating") {
      return;
    }

    const timer = window.setInterval(() => {
      setProgress((previous) => (previous >= 92 ? previous : previous + 8));
    }, 500);

    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (user) {
        setCurrentUser({ id: user.id, email: user.email ?? null });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      setCurrentUser(user ? { id: user.id, email: user.email ?? null } : null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (
      !currentUser ||
      searchParams.get("postAuth") !== "save" ||
      !generatedProfile ||
      autoSaveTriggeredRef.current
    ) {
      return;
    }

    autoSaveTriggeredRef.current = true;
    void handleSaveProfile({ silentSuccess: false });
  }, [currentUser, generatedProfile, searchParams]);

  useEffect(() => {
    if (phase !== "generating") {
      return;
    }

    const timer = window.setTimeout(() => {
      generatingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!generatedProfile || phase !== "result") {
      return;
    }

    const timer = window.setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 220);

    return () => window.clearTimeout(timer);
  }, [generatedProfile, phase]);

  async function handleImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setMessage({ type: "error", text: "为了保证 AI 识图稳定，请上传 4MB 以内的图片。" });
      return;
    }

    const dataUrl = await readAsDataUrl(file);
    setUploadedImage({
      name: file.name,
      type: file.type,
      dataUrl,
    });
    setImagePath(null);
    setMessage({ type: "info", text: "图片已添加到当前记忆草稿。" });
  }

  function toggleEmotion(emotion: string) {
    setSelectedEmotions((previous) =>
      previous.includes(emotion)
        ? previous.filter((item) => item !== emotion)
        : [...previous, emotion],
    );
  }

  async function handleGenerate() {
    if (!canGenerate) {
      setMessage({ type: "error", text: "请至少输入一段记忆内容，或上传一张图片，再生成专属香气方案。" });
      inputRef.current?.focus();
      return;
    }

    setMessage(null);
    setPhase("generating");
    setProgress(12);
    setGeneratedProfile(null);
    setFeedback(null);
    setExperienceOpen(false);
    setIsPlaying(false);
    setExperienceCompleted(false);

    try {
      const response = await fetch("/api/synthesize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          narrative,
          emotions: selectedEmotions,
          image: uploadedImage,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "生成失败，请稍后再试。");
      }

      const data = (await response.json()) as {
        profile: GeneratedScentProfile;
        imageAnalysisMode?: "glm" | "fallback" | "none";
        imageAnalysisNote?: string | null;
      };
      setGeneratedProfile(data.profile);
      setPhase("result");
      setProgress(100);
      if (uploadedImage) {
        setMessage(
          data.imageAnalysisMode === "glm"
            ? { type: "success", text: "GLM 已完成识图，MiniMax 已结合图片与文字生成方案。" }
            : data.imageAnalysisNote
              ? { type: "info", text: data.imageAnalysisNote }
              : { type: "success", text: "AI 已结合图片与文字线索生成方案。" },
        );
      } else {
        setMessage(null);
      }
      saveDraftToSession({
        ...currentDraft,
        generatedProfile: data.profile,
      });
    } catch (error) {
      setPhase("idle");
      setProgress(0);
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "生成时出现异常，请稍后再试。",
      });
    }
  }

  async function handleSaveProfile({ silentSuccess }: { silentSuccess: boolean }) {
    if (!generatedProfile) {
      setMessage({ type: "error", text: "请先生成方案，再执行保存。" });
      return;
    }

    if (!currentUser) {
      setPendingIntent("save");
      saveDraftToSession(currentDraft);
      router.push("/auth/login?intent=save&next=%2F%3FpostAuth%3Dsave");
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      setMessage({
        type: "error",
        text: "还没有配置 Supabase 环境变量，保存功能会在你完成配置后可用。",
      });
      return;
    }

    setIsSaving(true);

    try {
      setIsUploading(true);
      const uploadedPath = await uploadDraftImage(currentUser.id, uploadedImage, imagePath);
      setImagePath(uploadedPath);
      setIsUploading(false);

      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft: currentDraft,
          imagePath: uploadedPath,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errorPayload?.error ?? "保存失败，请稍后再试。");
      }

      const data = (await response.json()) as { id: string };
      const nextProfile = {
        ...generatedProfile,
        savedProfileId: data.id,
      };

      setGeneratedProfile(nextProfile);
      saveDraftToSession({
        ...currentDraft,
        generatedProfile: nextProfile,
        imagePath: uploadedPath,
      });
      clearPendingIntent();
      if (searchParams.get("postAuth") === "save") {
        router.replace("/");
      }
      if (!silentSuccess) {
        setMessage({ type: "success", text: "方案已保存到你的账户，可以随时回来查看。" });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "保存时出现异常，请稍后再试。",
      });
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  }

  function handlePurchase() {
    if (!generatedProfile) {
      setMessage({ type: "error", text: "请先生成方案，再进入购买流程。" });
      return;
    }

    saveDraftToSession(currentDraft);
    setPurchaseSheetOpen(true);
  }

  function confirmPurchase() {
    setIsNavigatingToCheckout(true);
    router.push("/checkout");
  }

  function handleExperienceClose() {
    setExperienceOpen(false);
    setIsPlaying(false);

    if (experienceCompleted) {
      window.setTimeout(() => {
        feedbackSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    }
  }

  function handleExperienceSave() {
    setExperienceOpen(false);
    setIsPlaying(false);
    void handleSaveProfile({ silentSuccess: false });
  }

  function handleExperiencePurchase() {
    setExperienceOpen(false);
    setIsPlaying(false);
    handlePurchase();
  }

  async function handleFeedback(value: string) {
    setFeedback(value);
    saveDraftToSession({
      ...currentDraft,
      feedback: value,
    });

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedbackValue: value,
          profileId: generatedProfile?.savedProfileId ?? null,
          profileTitle: generatedProfile?.title ?? null,
        }),
      });
    } catch {
      // Feedback is non-blocking for the main flow.
    }
  }

  return (
    <main className="min-h-screen">
      <PurchaseSheet
        open={purchaseSheetOpen}
        profile={generatedProfile}
        onClose={() => setPurchaseSheetOpen(false)}
        onConfirm={confirmPurchase}
      />
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-outline-variant/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <a href="#top" className="font-headline text-xl italic text-foreground sm:text-2xl">
            乡忆 ScentHome
          </a>
          <div className="hidden items-center gap-8 text-sm text-muted md:flex">
            <a href="#hero" className="transition hover:text-foreground">
              首页
            </a>
            <a href="#synthesis" className="transition hover:text-foreground">
              开始体验
            </a>
            <a href="#result" className="transition hover:text-foreground">
              方案结果
            </a>
            <a href="#footer" className="transition hover:text-foreground">
              关于
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <>
                <span className="hidden rounded-full bg-surface-high px-4 py-2 text-sm text-muted md:inline-flex">
                  {currentUser.email ?? "已登录用户"}
                </span>
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="rounded-full bg-surface-high px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-highest hover:text-foreground"
                  >
                    后台
                  </Link>
                ) : null}
                <SignOutButton
                  onSignedOut={() => {
                    setCurrentUser(null);
                  }}
                  className="rounded-full bg-surface-high px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-highest hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                />
              </>
            ) : (
              <Link
                href="/auth/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted transition hover:text-foreground"
              >
                登录
              </Link>
            )}
            <button
              type="button"
              onClick={() => document.getElementById("synthesis")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-gradient-to-br from-primary to-primary-soft px-5 py-3 text-sm font-semibold text-white shadow-ambient transition duration-500 hover:translate-y-[-1px] active:scale-[0.98]"
            >
              开始体验
            </button>
          </div>
        </div>
      </nav>

      <section id="top" className="scroll-section relative overflow-hidden px-4 pb-16 pt-24 sm:px-6 sm:pb-20 sm:pt-28 lg:px-8">
        <div className="floating-slower absolute right-0 top-10 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(185,236,238,0.7),transparent_65%)] blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-10 sm:gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <MotionReveal as="div" className="space-y-8" delay={60}>
            <div id="hero" className="space-y-8">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-tertiary">AI 乡愁气味体验平台</p>
              <h1 className="max-w-3xl font-headline text-4xl leading-[1.05] text-foreground sm:text-5xl md:text-7xl xl:text-8xl">
                把你记得住的
                <span className="italic text-primary"> 故乡味道 </span>
                重新带回来。
              </h1>
              <p className="max-w-xl text-lg leading-8 text-muted md:text-xl">
                通过文字、图片和情绪线索，AI 会把记忆拆解成一支可以体验、保存和购买的专属香气方案。
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <button
                type="button"
                onClick={() => document.getElementById("synthesis")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full rounded-2xl bg-gradient-to-br from-primary to-primary-soft px-7 py-4 text-base font-semibold text-white shadow-ambient transition active:scale-[0.98] sm:w-auto"
              >
                进入记忆生成
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full rounded-2xl bg-surface-high px-7 py-4 text-base font-semibold text-foreground transition hover:bg-surface-highest sm:w-auto"
              >
                查看体验流程
              </button>
            </div>
            </div>
          </MotionReveal>

          <MotionReveal as="div" className="relative" delay={140}>
            <div className="relative">
              <div className="floating-slow overflow-hidden rounded-[2rem] bg-surface-low shadow-ambient">
                <img
                  src="https://images.pexels.com/photos/30999189/pexels-photo-30999189.jpeg"
                  alt="ScentHome hero visual"
                  className="aspect-[4/5] h-full w-full object-cover opacity-90 mix-blend-multiply"
                />
              </div>
              <div className="glass-panel ghost-border soft-panel-enter absolute -bottom-10 left-4 hidden max-w-sm rounded-[1.75rem] p-6 shadow-glow md:block">
                <p className="font-headline text-2xl italic text-foreground">
                  “小时候下雨后，院子里湿土和木门混在一起的味道。”
                </p>
                <p className="mt-2 text-sm text-muted">系统会把这样的记忆线索转译成一支可体验的乡愁方案。</p>
              </div>
            </div>
          </MotionReveal>
        </div>
      </section>

      <MotionReveal as="section" id="synthesis" className="scroll-section bg-surface-low py-24">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="mb-14 space-y-4 text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-tertiary">Step 1 · 记忆输入</p>
            <h2 className="font-headline text-4xl text-foreground md:text-5xl">开始你的 AI 气味合成</h2>
            <p className="text-base text-muted md:text-lg">这里不会跳新页面，整个生成过程都在首页里完成。</p>
          </div>

          {message ? (
            <div
              className={cn(
                "message-enter mb-8 rounded-2xl px-5 py-4 text-sm shadow-sm",
                message.type === "success" && "bg-secondary/10 text-secondary",
                message.type === "error" && "bg-red-100 text-red-700",
                message.type === "info" && "bg-tertiary/10 text-tertiary",
              )}
            >
              {message.text}
            </div>
          ) : null}

          {!SUPABASE_CONFIGURED ? (
            <div className="mb-8 rounded-[1.5rem] bg-[#fff8eb] px-5 py-4 text-sm text-[#7a5a28]">
              当前站点已经具备前端和流程代码，但还没有填入 Supabase 环境变量。你把 `.env.local`
              配好后，登录、保存、订单和图片上传就会正式生效。
            </div>
          ) : null}

          <div className="rounded-[2rem] bg-surface p-8 shadow-ambient lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr]">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">
                    记忆输入
                  </label>
                  <textarea
                    ref={inputRef}
                    rows={7}
                    value={narrative}
                    onChange={(event) => setNarrative(event.target.value)}
                    placeholder="例如：小时候每到夏天，外婆院子里会有桂花、湿泥土和老木门的味道。傍晚风一吹，就特别想家。"
                    className="min-h-[220px] w-full rounded-[1.5rem] border-none bg-surface-low px-6 py-5 text-lg leading-8 text-foreground outline-none transition focus:bg-surface-high"
                  />
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-outline">
                    <span>支持较长文本输入，也可只上传图片生成</span>
                    <span>{narrative.length} characters</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">
                    图片上传
                  </label>
                  {uploadedImage ? (
                    <div className="overflow-hidden rounded-[1.5rem] bg-surface-low">
                      <img
                        src={uploadedImage.dataUrl}
                        alt={uploadedImage.name}
                        className="aspect-[16/9] w-full object-cover"
                      />
                      <div className="flex items-center justify-between gap-4 px-5 py-4">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{uploadedImage.name}</p>
                          <p className="text-xs text-muted">已作为本次记忆的视觉锚点</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setUploadedImage(null);
                            setImagePath(null);
                          }}
                          className="rounded-full bg-surface-high px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface-highest"
                        >
                          删除图片
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[1.5rem] border border-dashed border-outline-variant bg-surface-low px-6 py-12 text-center transition hover:border-tertiary/40">
                      <span className="font-headline text-3xl italic text-primary">Upload Memory</span>
                      <span className="max-w-sm text-sm leading-7 text-muted">
                        上传一张和记忆相关的照片，系统会在场景细节层做更高权重匹配。
                      </span>
                      <span className="rounded-full bg-secondary/10 px-5 py-3 text-sm font-semibold text-secondary">
                        选择图片
                      </span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageSelected} />
                    </label>
                  )}
                </div>
              </div>

              <div className="space-y-10">
                <div className="space-y-5">
                  <label className="text-sm font-semibold uppercase tracking-[0.24em] text-muted">
                    情绪标签
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {EMOTION_OPTIONS.map((emotion) => {
                      const selected = selectedEmotions.includes(emotion);
                      return (
                        <button
                          key={emotion}
                          type="button"
                          onClick={() => toggleEmotion(emotion)}
                          className={cn(
                            "rounded-full px-5 py-3 text-sm font-semibold transition",
                            selected
                              ? "bg-primary text-white"
                              : "border border-outline-variant bg-transparent text-muted hover:border-primary hover:text-primary",
                          )}
                        >
                          {emotion}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-[1.75rem] bg-tertiary/5 p-8 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.3em] text-tertiary">Step 2 · 开始合成</p>
                  <h3 className="mt-3 font-headline text-3xl italic text-foreground">准备好让 AI 开始了吗？</h3>
                  <p className="mt-4 text-sm leading-7 text-muted">
                    系统会结合你的记忆文本、情绪标签和图片线索生成专属方案；如果你只上传图片，也可以直接识别并生成。
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={!canGenerate || phase === "generating"}
                    className="mt-8 flex w-full items-center justify-center rounded-[1.25rem] bg-tertiary px-6 py-5 text-lg font-bold text-white shadow-glow transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {phase === "generating" ? "AI 生成中..." : "生成专属方案"}
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.5rem] bg-surface-low p-6">
                    <p className="text-xs uppercase tracking-[0.28em] text-outline">适合谁</p>
                    <p className="mt-4 text-sm leading-7 text-muted">
                      长期离乡的人、对家乡有强烈记忆的人、做沉浸式文化体验的人都可以直接使用。
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] bg-primary p-6 text-white">
                    <p className="text-xs uppercase tracking-[0.28em] text-white/70">当前流程</p>
                    <p className="mt-4 text-sm leading-7 text-white/85">
                      输入记忆 → AI 生成 → 体验方案 → 反馈 → 保存或购买
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MotionReveal>

      {phase === "generating" ? (
        <section ref={generatingSectionRef} className="fade-up-enter scroll-section px-6 py-24 lg:px-8">
          <div className="mx-auto max-w-5xl text-center">
            <div className="relative mx-auto mb-10 flex aspect-square max-w-[420px] items-center justify-center">
              <div className="glow-breathe scent-swirl absolute inset-0 rounded-full animate-pulseSlow" />
              <div className="absolute inset-8 rounded-full border border-tertiary/20 animate-orbit" />
              <div className="absolute inset-20 rounded-full border border-primary/10 animate-orbitReverse" />
              <div className="relative z-10 space-y-5">
                <p className="text-xs uppercase tracking-[0.35em] text-tertiary">AI 生成中</p>
                <h2 className="font-headline text-4xl text-foreground md:text-6xl">记忆正在被转成香气</h2>
                <p className="text-sm text-muted">系统会自动切换到结果模块，无需刷新页面。</p>
              </div>
            </div>
            <div className="mx-auto max-w-2xl rounded-[1.75rem] bg-surface-low p-8 shadow-ambient">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-outline">
                <span>当前进度</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-highest">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="mt-6 grid gap-4 text-left">
                {["解析记忆文本", "匹配区域气味", "校准情绪权重", "生成最终方案"].map((item, index) => {
                  const threshold = (index + 1) * 25;
                  const active = progress >= threshold;
                  return (
                    <div
                      key={item}
                      className={cn(
                        "rounded-2xl px-4 py-4 text-sm transition",
                        active ? "bg-white text-foreground shadow-sm" : "bg-surface text-muted",
                      )}
                    >
                      {item}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {generatedProfile ? (
        <section ref={resultSectionRef} id="result" className="fade-up-enter scroll-section bg-surface-low py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
            <MotionReveal as="div" className="space-y-8" delay={40}>
            <div className="space-y-8">
              <div className="space-y-4">
                <p className="text-xs uppercase tracking-[0.35em] text-primary">Archival Synthesis Complete</p>
                <h2 className="font-headline text-5xl leading-[1.1] text-foreground md:text-6xl">
                  {generatedProfile.title}
                </h2>
                <p className="text-lg leading-8 text-muted">{generatedProfile.summary}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {generatedProfile.scentTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-highest px-4 py-2 text-sm font-semibold text-muted">
                    {tag}
                  </span>
                ))}
                {generatedProfile.emotionTags.map((tag) => (
                  <span key={tag} className="rounded-full bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="rounded-[1.75rem] bg-white p-7 shadow-sm">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-outline">方案主信息</p>
                    <p className="mt-3 text-sm leading-7 text-muted">氛围：{generatedProfile.atmosphere}</p>
                    <p className="text-sm leading-7 text-muted">强度建议：{generatedProfile.intensityLabel}</p>
                    <p className="text-sm leading-7 text-muted">购买价格：{formatPrice(generatedProfile.price)}</p>
                  </div>
                  <div className="rounded-full bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary">
                    可立即体验
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  {(experiencePlan?.scenes ?? []).map((scene) => (
                    <div key={scene.id} className="rounded-2xl bg-surface-low px-4 py-4 text-sm leading-7 text-muted">
                      {scene.stepLabel}：{scene.narration}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            </MotionReveal>

            <MotionReveal as="div" className="space-y-8" delay={120}>
            <div className="space-y-8">
              <div className="relative overflow-hidden rounded-[2rem] bg-surface shadow-ambient">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(185,236,238,0.75),transparent_35%),linear-gradient(135deg,rgba(111,88,60,0.18),rgba(255,255,255,0))]" />
                <div className="relative space-y-6 p-8">
                  <p className="text-xs uppercase tracking-[0.28em] text-outline">结果可视化</p>
                  <div className="space-y-4">
                    <h3 className="font-headline text-3xl italic text-foreground">记忆意境画面</h3>
                    <p className="text-sm leading-7 text-muted">{generatedProfile.visualDescription}</p>
                    <p className="text-sm leading-7 text-muted">{generatedProfile.archiveNote}</p>
                  </div>
                  <div className="rounded-[1.5rem] bg-background/80 p-5">
                    <p className="text-xs uppercase tracking-[0.24em] text-outline">结果操作区</p>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          void primeImmersiveAudio();
                          setExperienceOpen(true);
                          setIsPlaying(true);
                          setExperienceCompleted(false);
                        }}
                        className="rounded-2xl bg-gradient-to-br from-primary to-primary-soft px-6 py-4 text-base font-bold text-white shadow-ambient"
                      >
                        立即体验
                      </button>
                      <button
                        type="button"
                        onClick={handleGenerate}
                        className="rounded-2xl bg-surface-highest px-6 py-4 text-base font-bold text-foreground transition hover:bg-surface-high"
                      >
                        重新生成新方案
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveProfile({ silentSuccess: false })}
                        disabled={isSaving}
                        className="rounded-2xl border border-outline-variant px-6 py-4 text-base font-bold text-foreground transition hover:bg-surface-low disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSaving ? "保存中..." : "保存方案"}
                      </button>
                      <button
                        type="button"
                        onClick={handlePurchase}
                        disabled={isNavigatingToCheckout}
                        className="rounded-2xl border border-outline-variant px-6 py-4 text-base font-bold text-foreground transition hover:bg-surface-low"
                      >
                        {isNavigatingToCheckout ? "跳转中..." : "购买方案"}
                      </button>
                    </div>
                    {isUploading ? <p className="mt-4 text-sm text-tertiary">正在上传图片到 Supabase Storage...</p> : null}
                  </div>
                </div>
              </div>
            </div>
            </MotionReveal>
          </div>
        </section>
      ) : null}

      {generatedProfile && experienceOpen ? (
        <MultisensoryExperience
          profile={generatedProfile}
          narrative={narrative}
          emotions={selectedEmotions}
          isPlaying={isPlaying}
          experienceCompleted={experienceCompleted}
          intensity={intensity}
          onClose={handleExperienceClose}
          onSave={handleExperienceSave}
          onPurchase={handleExperiencePurchase}
          onIntensityChange={setIntensity}
          onPlayingChange={setIsPlaying}
          onCompletedChange={setExperienceCompleted}
        />
      ) : null}

      {generatedProfile && experienceCompleted ? (
        <section ref={feedbackSectionRef} id="feedback" className="fade-up-enter scroll-section bg-surface-low py-24">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <p className="text-xs uppercase tracking-[0.35em] text-tertiary">Step 4 · 快速反馈</p>
            <h2 className="mt-4 font-headline text-4xl text-foreground md:text-5xl">这次体验像你记忆里的家吗？</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted">
              你不需要写长评论，点一下就行。反馈会帮助后续方案更贴近你的真实记忆。
            </p>
            <div className="mt-12 grid gap-5 md:grid-cols-4">
              {FEEDBACK_OPTIONS.map((option) => {
                const active = feedback === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => void handleFeedback(option.value)}
                    className={cn(
                      "rounded-[1.5rem] px-5 py-6 text-left transition",
                      active ? "bg-primary text-white shadow-ambient" : "bg-white text-foreground shadow-sm hover:bg-surface",
                    )}
                  >
                    <p className="font-headline text-2xl">{option.label}</p>
                    <p className={cn("mt-2 text-sm leading-7", active ? "text-white/85" : "text-muted")}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="mt-12 flex flex-wrap justify-center gap-4">
              <button
                type="button"
                onClick={handleGenerate}
                className="rounded-full bg-surface-highest px-6 py-3 text-sm font-bold text-foreground"
              >
                重新生成新方案
              </button>
              <button
                type="button"
                onClick={() => void handleSaveProfile({ silentSuccess: false })}
                className="rounded-full bg-surface-highest px-6 py-3 text-sm font-bold text-foreground"
              >
                保存方案
              </button>
              <button
                type="button"
                onClick={handlePurchase}
                className="rounded-full bg-gradient-to-br from-primary to-primary-soft px-6 py-3 text-sm font-bold text-white"
              >
                购买方案
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <MotionReveal
        as="section"
        className="scroll-section mx-auto grid max-w-7xl gap-6 px-6 py-24 lg:grid-cols-12 lg:px-8"
      >
        <div className="rounded-[2rem] bg-surface-high p-10 lg:col-span-8">
          <h3 className="max-w-3xl font-headline text-4xl leading-tight text-foreground md:text-5xl">
            从记忆文本到香气方案，不是跳出式工具，而是一段连贯体验。
          </h3>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div>
              <p className="font-headline text-2xl text-tertiary">01. 输入</p>
              <p className="mt-3 text-sm leading-7 text-muted">文字、图片、情绪标签一起组成“乡愁线索”。</p>
            </div>
            <div>
              <p className="font-headline text-2xl text-tertiary">02. 生成</p>
              <p className="mt-3 text-sm leading-7 text-muted">系统在首页内展示 AI 处理进度，再自动切换到结果模块。</p>
            </div>
            <div>
              <p className="font-headline text-2xl text-tertiary">03. 行动</p>
              <p className="mt-3 text-sm leading-7 text-muted">你可以体验、反馈、保存方案，或者直接进入购买流程。</p>
            </div>
          </div>
        </div>
        <div className="rounded-[2rem] bg-primary p-10 text-white lg:col-span-4">
          <p className="text-xs uppercase tracking-[0.3em] text-white/70">适合部署到 Vercel</p>
          <h3 className="mt-4 font-headline text-3xl italic">前端和后端逻辑已按 Supabase 架构组织</h3>
          <p className="mt-4 text-sm leading-7 text-white/85">
            后面你只需要填环境变量、执行 SQL、连上 Vercel，就能把这套站点正式部署出去。
          </p>
        </div>
      </MotionReveal>

      <footer id="footer" className="border-t border-outline-variant/10 bg-background py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 text-sm text-muted md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-headline text-2xl italic text-foreground">乡忆 ScentHome</p>
            <p className="mt-2 max-w-md leading-7">
              用技术重构乡愁体验，用气味保存人与故乡之间最难被替代的记忆线索。
            </p>
          </div>
          <div className="flex flex-wrap gap-6">
            <a href="#synthesis" className="transition hover:text-foreground">
              开始体验
            </a>
            <Link href="/auth/login" className="transition hover:text-foreground">
              登录
            </Link>
            <Link href="/checkout" className="transition hover:text-foreground">
              付款页
            </Link>
            {isAdmin ? (
              <Link href="/admin" className="transition hover:text-foreground">
                后台
              </Link>
            ) : null}
          </div>
        </div>
      </footer>
    </main>
  );
}
