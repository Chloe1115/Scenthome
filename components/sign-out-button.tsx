"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type SignOutButtonProps = {
  className?: string;
  onSignedOut?: () => void;
};

export function SignOutButton({ className, onSignedOut }: SignOutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    setIsSigningOut(true);

    try {
      await supabase.auth.signOut();
      onSignedOut?.();
      router.replace("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      disabled={isSigningOut}
      className={className}
    >
      {isSigningOut ? "退出中..." : "退出登录"}
    </button>
  );
}
