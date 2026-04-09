import { CheckoutPage } from "@/components/checkout-page";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function CheckoutRoute() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return <CheckoutPage initialUser={null} initialIsAdmin={false} />;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <CheckoutPage
      initialUser={user ? { id: user.id, email: user.email ?? null } : null}
      initialIsAdmin={isAdminEmail(user?.email)}
    />
  );
}
