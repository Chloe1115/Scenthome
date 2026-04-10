"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { clearDraftFromSession, clearPendingIntent } from "@/lib/client-draft";

type ConfirmationState =
  | {
      kind: "loading";
    }
  | {
      kind: "success";
      orderId: string;
      email: string | null;
    }
  | {
      kind: "error";
      message: string;
    };

export function CheckoutSuccessClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState<ConfirmationState>({ kind: "loading" });

  useEffect(() => {
    if (!sessionId) {
      setState({
        kind: "error",
        message: "Missing Stripe session. Please return to checkout and try again.",
      });
      return;
    }

    let cancelled = false;
    const activeSessionId = sessionId;

    async function confirmOrder() {
      try {
        const response = await fetch(`/api/stripe/checkout-session?session_id=${encodeURIComponent(activeSessionId)}`, {
          method: "GET",
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; status?: string; orderId?: string; email?: string | null }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to confirm your Stripe payment.");
        }

        if (payload?.status !== "paid" || !payload.orderId) {
          throw new Error("Your payment has not been marked as paid yet. Please refresh in a moment.");
        }

        clearDraftFromSession();
        clearPendingIntent();

        if (!cancelled) {
          setState({
            kind: "success",
            orderId: payload.orderId,
            email: payload.email ?? null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: "error",
            message: error instanceof Error ? error.message : "Unable to confirm your Stripe payment.",
          });
        }
      }
    }

    void confirmOrder();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-2xl rounded-[2rem] bg-surface p-8 shadow-ambient md:p-10">
        {state.kind === "loading" ? (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Stripe Checkout</p>
            <h1 className="mt-4 font-headline text-4xl text-foreground">Confirming your payment...</h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              We are verifying the Stripe session and finalizing your order in Supabase.
            </p>
          </>
        ) : null}

        {state.kind === "success" ? (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-secondary">Payment Complete</p>
            <h1 className="mt-4 font-headline text-4xl text-foreground">Your order is confirmed.</h1>
            <p className="mt-4 text-sm leading-7 text-muted">
              Stripe marked the payment as successful and your order has been recorded.
            </p>
            <div className="mt-6 rounded-[1.5rem] bg-background px-5 py-4 text-sm text-muted">
              <p>Order ID: {state.orderId}</p>
              <p className="mt-2">Email: {state.email ?? "Not provided"}</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="rounded-full bg-gradient-to-r from-primary to-primary-soft px-6 py-3 text-center text-sm font-semibold text-white"
              >
                Return home
              </Link>
              <Link
                href="/checkout"
                className="rounded-full bg-surface-high px-6 py-3 text-center text-sm font-semibold text-foreground"
              >
                Back to checkout
              </Link>
            </div>
          </>
        ) : null}

        {state.kind === "error" ? (
          <>
            <p className="text-xs uppercase tracking-[0.3em] text-red-600">Payment Status Unknown</p>
            <h1 className="mt-4 font-headline text-4xl text-foreground">We could not confirm the payment yet.</h1>
            <p className="mt-4 text-sm leading-7 text-muted">{state.message}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/checkout"
                className="rounded-full bg-gradient-to-r from-primary to-primary-soft px-6 py-3 text-center text-sm font-semibold text-white"
              >
                Return to checkout
              </Link>
              <Link
                href="/"
                className="rounded-full bg-surface-high px-6 py-3 text-center text-sm font-semibold text-foreground"
              >
                Back home
              </Link>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
