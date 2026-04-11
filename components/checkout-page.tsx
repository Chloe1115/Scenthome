"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MotionReveal } from "@/components/motion-reveal";
import { SignOutButton } from "@/components/sign-out-button";
import { clearPendingIntent, readDraftFromSession, saveDraftToSession } from "@/lib/client-draft";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppUser, ShippingFormValues, ScentDraft } from "@/lib/types";
import { formatPrice, slugify } from "@/lib/utils";

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
  country: "China",
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
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get("canceled") === "1") {
      setError("Stripe payment was canceled. Your draft is still here, so you can try again whenever you are ready.");
    }
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
      setError("There is no product to purchase yet. Please generate a scent profile first.");
      return;
    }

    if (!SUPABASE_CONFIGURED) {
      setError("Supabase is not configured yet, so Stripe checkout cannot start.");
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

      const response = await fetch("/api/stripe/checkout-session", {
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
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; url?: string } | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to start Stripe Checkout. Please try again.");
      }

      if (!payload?.url) {
        throw new Error("Stripe Checkout URL was not returned.");
      }

      clearPendingIntent();
      setMessage("Redirecting you to Stripe Checkout...");
      window.location.assign(payload.url);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start Stripe Checkout.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!draft?.generatedProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="soft-panel-enter max-w-xl rounded-[2rem] bg-surface p-10 text-center shadow-ambient">
          <h1 className="font-headline text-4xl text-foreground">No checkout item yet</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            Generate a scent memory first, then come back here to complete payment with Stripe.
          </p>
          <Link
            href="/"
            className="mt-8 inline-flex rounded-full bg-gradient-to-br from-primary to-primary-soft px-6 py-3 text-sm font-bold text-white"
          >
            Return home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="fixed inset-x-0 top-0 z-40 border-b border-outline-variant/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          <Link href="/" className="font-headline text-xl italic text-foreground sm:text-2xl">
            ScentHome
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="hidden text-sm uppercase tracking-[0.3em] text-muted sm:block">Secure Checkout</div>
            {isAdmin ? (
              <Link
                href="/admin"
                className="rounded-full bg-surface-high px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-highest hover:text-foreground"
              >
                Admin
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

      <div className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:grid-cols-12 lg:gap-16 lg:px-8">
        <MotionReveal as="aside" className="lg:col-span-5" delay={40}>
          <div className="space-y-8 lg:sticky lg:top-28">
            <section>
              <h2 className="font-headline text-3xl text-foreground sm:text-4xl">Order Summary</h2>
              <div className="mt-6 flex flex-col gap-5 rounded-[1.5rem] bg-surface p-5 shadow-ambient sm:mt-8 sm:rounded-[2rem] sm:p-6 md:flex-row">
                <div className="w-full overflow-hidden rounded-[1.25rem] bg-surface-low md:w-28 md:shrink-0">
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
                  <h3 className="font-headline text-2xl leading-tight text-foreground sm:text-3xl">
                    {draft.generatedProfile.productName}
                  </h3>
                  <p className="text-sm leading-7 text-muted">{draft.generatedProfile.summary}</p>
                  <p className="text-sm font-semibold text-foreground">{formatPrice(draft.generatedProfile.price)}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4 rounded-[1.5rem] bg-surface p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Product</span>
                <span>{formatPrice(draft.generatedProfile.price)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-muted">
                <span>Shipping</span>
                <span>{formatPrice(18)}</span>
              </div>
              <div className="border-t border-outline-variant/20 pt-4">
                <div className="flex items-end justify-between">
                  <span className="font-headline text-2xl text-foreground">Total</span>
                  <span className="font-headline text-3xl text-primary">{formatPrice(totalPrice)}</span>
                </div>
              </div>
            </section>
          </div>
        </MotionReveal>

        <MotionReveal as="section" className="lg:col-span-7" delay={120}>
          {message ? <div className="message-enter mb-6 rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{message}</div> : null}
          {error ? <div className="message-enter mb-6 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <form className="space-y-8 sm:space-y-10" onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-headline italic text-white">
                  1
                </span>
                <h2 className="font-headline text-2xl text-foreground sm:text-3xl">Shipping Details</h2>
              </div>

              <div
                className={`rounded-[1.5rem] px-5 py-4 text-sm leading-7 ${
                  currentUser ? "bg-secondary/10 text-secondary" : "bg-primary/8 text-muted"
                }`}
              >
                {currentUser
                  ? "Your order will be linked to the signed-in account, and we will prefill the contact email."
                  : "You can still check out as a guest. We will use the email below for payment receipts and order follow-up."}
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={formValues.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high md:col-span-2"
                />
                <input
                  required
                  placeholder="First name"
                  value={formValues.firstName}
                  onChange={(event) => updateField("firstName", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
                <input
                  required
                  placeholder="Last name"
                  value={formValues.lastName}
                  onChange={(event) => updateField("lastName", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
                <input
                  required
                  placeholder="Street address"
                  value={formValues.street}
                  onChange={(event) => updateField("street", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high md:col-span-2"
                />
                <input
                  required
                  placeholder="City"
                  value={formValues.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
                <input
                  required
                  placeholder="Postal code"
                  value={formValues.postalCode}
                  onChange={(event) => updateField("postalCode", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high"
                />
                <input
                  required
                  placeholder="Country"
                  value={formValues.country}
                  onChange={(event) => updateField("country", event.target.value)}
                  className="rounded-2xl border-none bg-surface-low px-4 py-4 outline-none transition focus:bg-surface-high md:col-span-2"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-headline italic text-white">
                  2
                </span>
                <h2 className="font-headline text-2xl text-foreground sm:text-3xl">Stripe Payment</h2>
              </div>

              <div className="space-y-4 rounded-[2rem] bg-surface-low p-6">
                <p className="text-sm leading-7 text-muted">
                  Card details are now handled by Stripe Checkout, not by this page. After you confirm the
                  address above, we will redirect you to Stripe&apos;s secure hosted payment form.
                </p>
                <div className="rounded-[1.25rem] bg-white px-4 py-4 text-sm text-muted">
                  Stripe manages card entry, 3D Secure authentication, and payment confirmation.
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-[1.25rem] bg-gradient-to-r from-primary to-primary-soft px-5 py-5 text-lg font-semibold text-white shadow-ambient transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Redirecting to Stripe..." : "Continue to secure payment"}
              </button>
              <div className="text-center">
                <Link href="/" className="text-sm font-semibold text-primary underline underline-offset-4">
                  Return to your scent profile
                </Link>
              </div>
            </div>
          </form>
        </MotionReveal>
      </div>
    </main>
  );
}
