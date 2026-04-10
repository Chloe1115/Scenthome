# Stripe Setup

Add these environment variables before testing real payments:

```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

This project now uses Stripe Checkout for one-time payments in CNY.

Local test flow:

1. Add the Stripe keys to `.env.local`.
2. Restart `npm run dev`.
3. Open `/checkout` and continue to the hosted Stripe page.
4. Use Stripe test card `4242 4242 4242 4242`.
5. Forward Stripe events locally with `stripe listen --forward-to localhost:3000/api/stripe/webhook`.

Important:

- The checkout flow creates a pending order first, then marks it as `paid` after Stripe confirms the session.
- The success page finalizes the order in Supabase, so `SUPABASE_SERVICE_ROLE_KEY` must also be configured.
