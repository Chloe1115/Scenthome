export async function POST(request: Request) {
  void request;

  return Response.json(
    {
      error: "Direct order submission is disabled. Use Stripe Checkout instead.",
    },
    { status: 410 },
  );
}
