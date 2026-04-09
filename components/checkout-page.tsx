"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MotionReveal } from "@/components/motion-reveal";
import { SignOutButton } from "@/components/sign-out-button";
import { clearPendingIntent, readDraftFromSession, saveDraftToSession } from "@/lib/client-draft";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppUser, ShippingFormValues, ScentDraft } from "@/lib/types";
import { formatPrice, maskCardNumber, slugify } from "@/lib/utils";

type CheckoutPageProps = {
  initialUser: AppUser;
  initialIsAdmin: boolean;
};

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

const defaultForm: ShippingFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  street: "",
  city: "",
  postalCode: "",
  country: "中国",
  cardNumber: "",
  expiryDate: "",
  cvc: "",
};

async function uploadDraftImage(userId: string, draft: ScentDraft) {
  if (!draft.image) {
    return draft.imagePath ?? null;
  }

  if (draft.imagePath) {
    return draft.imagePath;
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const blob = await fetch(draft.image.dataUrl).then((response) => response.blob());
  const extension = draft.image.type.split("/")[1] || "png";
  const path = `${userId}/${Date.now()}-${slugify(draft.image.name || "checkout-image")}.${extension}`;
  const { error } = await supabase.storage.from("memory-images").upload(path, blob, {
    contentType: draft.image.type,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  return path;
}

export function CheckoutPage({ initialUser, initialIsAdmin }: CheckoutPageProps) {
  const [currentUser, setCurrentUser] = useState<AppUser>(initialUser);
  const isAdmin = Boolean(currentUser?.email && initialIsAdmin && currentUser.email === initialUser?.email);
  const [draft, setDraft] = useState<ScentDraft | null>(null);
  const [formValues, setFormValues] = useState<ShippingFormValues>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const storedDraft = readDraftFromSession();
    setDraft(storedDraft);
  }, []);

  useEffect(() => {
    if (!currentUser?.email) {
      return;
    }

    setFormValues((previous) => ({
      ...previous,
      email: previous.email || currentUser.email || "",
    }));
  }, [currentUser]);

  const totalPrice = useMemo(() => {
    if (!draft?.generatedProfile) {
      return 0;
    }

    return draft.generatedProfile.price + 18;
  }, [draft]);

  function updateField<K extends keyof ShippingFormValues>(key: K, value: ShippingFormValues[K]) {
    setFormValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!draft?.generatedProfile) {
      setError("当前没有可购买的方案，请先回首页生成内容。");
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      setError("还没有配置 Supabase 环境变量，订单暂时无法提交。");
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedPath = currentUser ? await uploadDraftImage(currentUser.id, draft) : draft.imagePath ?? null;
      const nextDraft = {
        ...draft,
        imagePath: uploadedPath,
      };
      saveDraftToSession(nextDraft);
      setDraft(nextDraft);

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          draft: nextDraft,
          contactEmail: formValues.email,
          shippingAddress: {
            email: formValues.email,
            first_name: formValues.firstName,
            last_name: formValues.lastName,
            street: formValues.street,
            city: formValues.city,
            postal_code: formValues.postalCode,
            country: formValues.country,
          },
          paymentSummary: {
            brand: "card",
            last4: maskCardNumber(formValues.cardNumber).slice(-4),
          },
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "订单提交失败，请稍后再试。");
      }

      clearPendingIntent();
      setMessage(
        currentUser
          ? "订单已提交到 Supabase。这个 MVP 版本不会实际扣款，但会完整记录订单与收货信息。"
          : "访客订单已提交。我们会用你填写的邮箱作为联系凭证；如果后续想保存方案，再创建账户即可。",
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后再试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!draft?.generatedProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="soft-panel-enter max-w-xl rounded-[2rem] bg-surface p-10 text-center shadow-ambient">
          <h1 className="font-headline text-4xl text-foreground">还没有可结算的方案</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            请先回首页输入记忆并生成专属香气方案，然后再进入购买流程。
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-gradient-to-br from-primary to-primary-soft px-6 py-3 text-sm font-bold text-white"
          >
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-outline-variant/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
          <Link href="/" className="font-headline text-2xl italic text-foreground">
            乡忆 ScentHome
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-sm uppercase tracking-[0.3em] text-muted">Secure Checkout</div>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-full bg-surface-high px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-highest hover:text-foreground"
              >
                后台
              </Link>
            ) : null}
            {currentUser ? (
              <SignOutButton
                onSignedOut={() => {
                  setCurrentUser(null);
                }}
                className="rounded-full bg-surface-high px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-highest hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-32 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <MotionReveal as="aside" className="lg:col-span-5" delay={40}>
          <div className="space-y-8 lg:sticky lg:top-28">
            <section>
              <h2 className="font-headline text-4xl text-foreground">订单概览</h2>
              <div className="mt-8 flex gap-5 rounded-[2rem] bg-surface p-6 shadow-ambient">
                <div className="w-28 shrink-0 overflow-hidden rounded-[1.25rem] bg-surface-low">
                  {draft.image ? (
                    <img src={draft.image.dataUrl} alt={draft.image.name} className="aspect-[4/5] h-full w-full object-cover" />
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-primary/15 to-tertiary/15 font-headline text-center text-lg italic text-primary">
                      Scent
                      <br />
                      Memory
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <h3 className="font-headline text-2xl leading-tight text-foreground">
                    {draft.generatedProfile.productName}
                  </h3>
                  <p className="text-sm leading-7 text-muted">{draft.generatedProfile.summary}</p>
                  <p className="text-sm font-semibold text-foreground">{formatPrice(draft.generatedProfile.price)}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-[2rem] bg-surface p-6 shadow-sm">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>商品金额</span>
                <span>{formatPrice(draft.generatedProfile.price)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted">
                <span>运费</span>
                <span>{formatPrice(18)}</span>
              </div>
              <div className="border-t border-outline-variant/20 pt-4">
                <div className="flex items-end justify-between">
                  <span className="font-headline text-2xl text-foreground">总计</span>
                  <span className="font-headline text-3xl text-primary">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </section>
          </div>
        </MotionReveal>

        <MotionReveal as="section" className="lg:col-span-7" delay={120}>
          {message ? <div className="message-enter mb-6 rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{message}</div> : null}
          {error ? <div className="message-enter mb-6 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <form className="space-y-10" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-headline italic text-white">
                  1
                </span>
                <h2 className="font-headline text-3xl text-foreground">收货地址</h2>
              </div>

              <div
                className={`rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${
                  currentUser ? "bg-secondary/10 text-secondary" : "bg-primary/8 text-muted"
                }`}
              >
                {currentUser
                  ? "你已登录，订单会和当前账户关联，邮箱也会自动带入。"
                  : "你正在以访客身份下单，不需要先登录；请填写邮箱，方便后续联系与确认订单。"}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <input
                  required
                  type="email"
                  placeholder="联系邮箱"
                  value={formValues.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high md:col-span-2"
                />
                <input
                  required
                  placeholder="名"
                  value={formValues.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
                <input
                  required
                  placeholder="姓"
                  value={formValues.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
                <input
                  required
                  placeholder="街道地址"
                  value={formValues.street}
                  onChange={(event) => updateField("street", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high md:col-span-2"
                />
                <input
                  required
                  placeholder="城市"
                  value={formValues.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
                <input
                  required
                  placeholder="邮编"
                  value={formValues.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-headline italic text-white">
                  2
                </span>
                <h2 className="font-headline text-3xl text-foreground">付款信息</h2>
              </div>

              <div className="space-y-5 rounded-[2rem] bg-surface-low p-6">
                <input
                  required
                  placeholder="卡号"
                  value={formValues.cardNumber}
                  onChange={(event) => updateField("cardNumber", event.target.value)}
                  className="w-full rounded-2xl border-none bg-white px-4 py-4 outline-none"
                />
                <div className="grid gap-5 md:grid-cols-2">
                  <input
                    required
                    placeholder="MM / YY"
                    value={formValues.expiryDate}
                    onChange={(event) => updateField("expiryDate", event.target.value)}
                    className="rounded-2xl border-none bg-white px-4 py-4 outline-none"
                  />
                  <input
                    required
                    placeholder="CVC"
                    value={formValues.cvc}
                    onChange={(event) => updateField("cvc", event.target.value)}
                    className="rounded-2xl border-none bg-white px-4 py-4 outline-none"
                  />
                </div>
                <p className="text-xs leading-6 text-muted">
                  出于安全考虑，本项目不会存储完整卡号；只会在订单记录里保留末四位用于示例订单展示。
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[1.25rem] bg-gradient-to-r from-primary to-primary-soft px-5 py-5 text-lg font-semibold text-white shadow-ambient transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "提交中..." : "完成购买"}
              </button>
              <div className="text-center">
                <Link href="/" className="text-sm font-semibold text-primary underline underline-offset-4">
                  返回方案页
                </Link>
              </div>
            </div>
          </form>
        </MotionReveal>
      </div>
    </main>
  );
}
