import { Suspense } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
import { HomePage } from "@/components/home-page";

export default async function Page() {
  const supabase = await createSupabaseServerClient();
  let initialUser: AppUser = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      initialUser = { id: user.id, email: user.email ?? null };
    }
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomePage initialUser={initialUser} />
    </Suspense>
  );
}
