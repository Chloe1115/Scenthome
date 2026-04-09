import { Suspense } from "react";

import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
import { HomePage } from "@/components/home-page";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  let initialUser: AppUser = null;
  let initialIsAdmin = false;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      initialUser = { id: user.id, email: user.email ?? null };
      initialIsAdmin = isAdminEmail(user.email);
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomePage initialUser={initialUser} initialIsAdmin={initialIsAdmin} />
    </Suspense>
  );
}
