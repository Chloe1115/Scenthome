import Link from "next/link";

import { SignOutButton } from "@/components/sign-out-button";
import { formatPrice } from "@/lib/utils";

export type AdminUserRow = {
  id: string;
  email: string;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  orderCount: number;
};

export type AdminOrderRow = {
  id: string;
  accountEmail: string | null;
  contactEmail: string | null;
  productName: string;
  amount: number;
  status: string;
  createdAt: string | null;
  shippingName: string;
  shippingSummary: string;
};

type AdminDashboardProps = {
  adminEmail: string;
  stats: {
    totalUsers: number;
    totalOrders: number;
    guestOrders: number;
    totalRevenue: number;
  };
  users: AdminUserRow[];
  orders: AdminOrderRow[];
};

function formatDateTime(value: string | null) {
  if (!value) {
    return "暂无";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "submitted") {
    return "已提交";
  }

  return status;
}

export function AdminDashboard({ adminEmail, stats, users, orders }: AdminDashboardProps) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-outline-variant/10 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin Console</p>
            <h1 className="mt-3 font-headline text-4xl italic text-foreground">ScentHome 后台</h1>
            <p className="mt-3 text-sm leading-7 text-muted">当前管理员：{adminEmail}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-surface-high px-5 py-3 text-sm font-medium text-muted transition hover:bg-surface-highest hover:text-foreground"
            >
              返回首页
            </Link>
            <SignOutButton className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-10 px-6 py-10 lg:px-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[2rem] bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">注册用户</p>
            <p className="mt-4 font-headline text-4xl text-foreground">{stats.totalUsers}</p>
          </div>
          <div className="rounded-[2rem] bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">订单总数</p>
            <p className="mt-4 font-headline text-4xl text-foreground">{stats.totalOrders}</p>
          </div>
          <div className="rounded-[2rem] bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">访客订单</p>
            <p className="mt-4 font-headline text-4xl text-foreground">{stats.guestOrders}</p>
          </div>
          <div className="rounded-[2rem] bg-surface p-6 shadow-sm">
            <p className="text-xs uppercase tracking-[0.24em] text-muted">累计金额</p>
            <p className="mt-4 font-headline text-4xl text-primary">{formatPrice(stats.totalRevenue)}</p>
          </div>
        </section>

        <section className="rounded-[2rem] bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Registered Users</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">注册用户列表</h2>
            </div>
            <p className="text-sm text-muted">按注册时间倒序显示，含登录和下单概览。</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-2">邮箱</th>
                  <th className="px-4 py-2">注册时间</th>
                  <th className="px-4 py-2">最近登录</th>
                  <th className="px-4 py-2">邮箱验证</th>
                  <th className="px-4 py-2">订单数</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="rounded-2xl bg-background text-sm text-foreground">
                    <td className="rounded-l-2xl px-4 py-4">{user.email}</td>
                    <td className="px-4 py-4 text-muted">{formatDateTime(user.createdAt)}</td>
                    <td className="px-4 py-4 text-muted">{formatDateTime(user.lastSignInAt)}</td>
                    <td className="px-4 py-4 text-muted">{user.emailConfirmedAt ? "已验证" : "未验证"}</td>
                    <td className="rounded-r-2xl px-4 py-4">{user.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 ? <p className="py-8 text-sm text-muted">还没有读到注册用户数据。</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Orders</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">购物与订单信息</h2>
            </div>
            <p className="text-sm text-muted">展示最近订单、访客下单邮箱和收货信息摘要。</p>
          </div>

          <div className="mt-6 grid gap-4">
            {orders.map((order) => (
              <article key={order.id} className="rounded-[1.75rem] bg-background p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <p className="font-headline text-2xl text-foreground">{order.productName}</p>
                    <p className="text-sm text-muted">下单时间：{formatDateTime(order.createdAt)}</p>
                    <p className="text-sm text-muted">
                      账户邮箱：{order.accountEmail ?? "访客下单"}
                    </p>
                    <p className="text-sm text-muted">
                      联系邮箱：{order.contactEmail ?? "未填写"}
                    </p>
                  </div>
                  <div className="text-left lg:text-right">
                    <p className="font-headline text-3xl text-primary">{formatPrice(order.amount)}</p>
                    <p className="mt-2 text-sm text-muted">{statusLabel(order.status)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 border-t border-outline-variant/10 pt-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">收货人</p>
                    <p className="mt-2 text-sm text-foreground">{order.shippingName}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">地址摘要</p>
                    <p className="mt-2 text-sm text-foreground">{order.shippingSummary}</p>
                  </div>
                </div>
              </article>
            ))}
            {orders.length === 0 ? <p className="py-8 text-sm text-muted">还没有订单数据。</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
