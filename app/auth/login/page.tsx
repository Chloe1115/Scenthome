import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const intent =
    typeof resolvedSearchParams.intent === "string" ? resolvedSearchParams.intent : undefined;
  const next =
    typeof resolvedSearchParams.next === "string" ? resolvedSearchParams.next : undefined;

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

  if (initialUser) {
    redirect(intent === "save" ? "/?postAuth=save" : next ?? "/");
  }

  return <LoginForm intent={intent} nextPath={next ?? "/"} />;
}
