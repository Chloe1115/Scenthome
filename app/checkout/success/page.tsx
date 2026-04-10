import { Suspense } from "react";

import { CheckoutSuccessClient } from "@/components/checkout-success-client";

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
          <div className="w-full max-w-2xl rounded-[2rem] bg-surface p-8 shadow-ambient md:p-10">
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Stripe Checkout</p>
            <h1 className="mt-4 font-headline text-4xl text-foreground">Loading payment confirmation...</h1>
          </div>
        </main>
      }
    >
      <CheckoutSuccessClient />
    </Suspense>
  );
}
