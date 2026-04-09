"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { clearPendingIntent } from "@/lib/client-draft";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginFormProps = {
  intent?: string;
  nextPath: string;
};

const SUPABASE_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export function LoginForm({ intent, nextPath }: LoginFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const heading = useMemo(() => {
    if (intent === "save") {
      return "登录后即可保存当前方案";
    }

    if (intent === "purchase") {
      return "登录后进入安全付款流程";
    }

    return "进入你的 ScentHome 档案馆";
  }, [intent]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!SUPABASE_CONFIGURED) {
      setError("还没有配置 Supabase 环境变量，所以暂时无法登录或注册。");
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setError("Supabase 客户端初始化失败，请检查环境变量。");
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        clearPendingIntent();
        router.push(intent === "save" ? "/?postAuth=save" : nextPath);
        router.refresh();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        clearPendingIntent();
        router.push(intent === "save" ? "/?postAuth=save" : nextPath);
        router.refresh();
      } else {
        setMessage("注册成功。请去邮箱确认账户后，再回来登录。");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败，请稍后重试。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <div className="absolute inset-0">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuD_-CLFN0_dDUuir3158RAtTq_TSIkyQJzGvglhbWRFlmsTItzHXbN9Fu_TZ7bacnokN4l6ak8O7Hc1K_3UExUhECb_-tYQT7fMw1tdQxkP6KipOVYk1otaE0Y9lL8zc-RfFJu7BzpwvkMhECrtPYkaG9SVyWGKD_c-tRBZ7x2IwKZfdqkfGPiYLB5xD_VNdwuJkKp1YsuRCUXW4m5w_WhOppMco4oIti8FARc__A9UvOvPJ8rhJr0-EsOCh1-40cy7SIg3ybZs28E"
          alt="Login background"
          className="h-full w-full scale-105 object-cover opacity-60 brightness-95"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/50 to-tertiary-soft/10" />
      </div>

      <nav className="relative z-10 flex justify-center px-6 py-10">
        <Link href="/" className="font-headline text-3xl italic text-foreground">
          乡忆 ScentHome
        </Link>
      </nav>

      <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-20">
        <div className="glass-panel ghost-border w-full max-w-[480px] rounded-[1.75rem] p-8 shadow-ambient md:p-12">
          <div className="mb-10 space-y-4 text-center">
            <h1 className="font-headline text-4xl leading-tight text-foreground md:text-5xl">{heading}</h1>
            <p className="mx-auto max-w-sm text-sm leading-7 text-muted">
              登录后可保存香气档案、继续支付流程，并把你的记忆体验长期保留在个人账户里。
            </p>
          </div>

          {message ? <div className="mb-6 rounded-2xl bg-secondary/10 px-4 py-3 text-sm text-secondary">{message}</div> : null}
          {error ? <div className="mb-6 rounded-2xl bg-red-100 px-4 py-3 text-sm text-red-700">{error}</div> : null}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-xs uppercase tracking-[0.25em] text-muted">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@scenthome.com"
                className="w-full rounded-2xl border-none bg-surface-low px-4 py-4 text-foreground outline-none transition focus:bg-surface-high"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-xs uppercase tracking-[0.25em] text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 位"
                className="w-full rounded-2xl border-none bg-surface-low px-4 py-4 text-foreground outline-none transition focus:bg-surface-high"
              />
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-br from-primary to-primary-soft px-5 py-4 text-base font-semibold text-white shadow-ambient transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "提交中..." : mode === "login" ? "登录" : "创建账户"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode((previous) => (previous === "login" ? "signup" : "login"));
                  setMessage(null);
                  setError(null);
                }}
                className="w-full rounded-2xl bg-surface-highest px-5 py-4 text-base font-semibold text-foreground transition hover:bg-surface-high"
              >
                {mode === "login" ? "没有账号？创建一个" : "已有账号？返回登录"}
              </button>
            </div>
          </form>

          <div className="mt-10 border-t border-outline-variant/20 pt-8 text-center text-xs uppercase tracking-[0.25em] text-outline">
            目前接入的是 Supabase Auth 邮箱登录
          </div>
        </div>
      </div>
    </main>
  );
}
