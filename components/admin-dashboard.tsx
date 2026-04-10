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
  paymentLabel: string;
  createdAt: string | null;
  shippingName: string;
  shippingSummary: string;
};

type AdminDashboardProps = {
  adminEmail: string;
  stats: {
    totalUsers: number;
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
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
  switch (status) {
    case "paid":
      return "已支付";
    case "pending_payment":
      return "待支付";
    case "submitted":
      return "旧版已提交";
    default:
      return status;
  }
}

function statusClassName(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "pending_payment":
      return "bg-amber-100 text-amber-700";
    case "submitted":
      return "bg-slate-200 text-slate-700";
    default:
      return "bg-surface-high text-muted";
  }
}

function InfoCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[2rem] border border-outline-variant/10 bg-surface p-6 shadow-sm">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">{label}</p>
      <p className={`mt-4 font-headline text-4xl ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

export function AdminDashboard({ adminEmail, stats, users, orders }: AdminDashboardProps) {
  const recentOrders = orders.slice(0, 6);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(185,236,238,0.16),transparent_30%),linear-gradient(180deg,#f7f5f0_0%,#f3efe8_100%)]">
      <header className="border-b border-outline-variant/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin Console</p>
            <h1 className="mt-3 font-headline text-4xl italic text-foreground">ScentHome 管理后台</h1>
            <p className="mt-3 text-sm leading-7 text-muted">
              当前管理员：{adminEmail}
            </p>
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
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard label="注册用户" value={stats.totalUsers} />
          <InfoCard label="全部订单" value={stats.totalOrders} />
          <InfoCard label="已确认收入" value={formatPrice(stats.totalRevenue)} accent />
          <InfoCard label="已支付订单" value={stats.paidOrders} />
          <InfoCard label="待支付订单" value={stats.pendingOrders} />
          <InfoCard label="访客订单" value={stats.guestOrders} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-[2rem] border border-outline-variant/10 bg-surface p-6 shadow-sm">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Orders</p>
                <h2 className="mt-2 font-headline text-3xl text-foreground">订单与收货信息</h2>
              </div>
              <p className="text-sm text-muted">按最新时间倒序排列，方便你快速看付款和地址。</p>
            </div>

            <div className="mt-6 grid gap-4">
              {recentOrders.map((order) => (
                <article key={order.id} className="rounded-[1.75rem] bg-background p-5 shadow-[0_8px_24px_rgba(78,69,60,0.06)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-headline text-2xl text-foreground">{order.productName}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted">订单时间：{formatDateTime(order.createdAt)}</p>
                      <p className="text-sm text-muted">收货人：{order.shippingName}</p>
                      <p className="text-sm text-muted">地址：{order.shippingSummary}</p>
                      <p className="text-sm text-muted">账户邮箱：{order.accountEmail ?? "访客下单"}</p>
                      <p className="text-sm text-muted">联系邮箱：{order.contactEmail ?? "未提供"}</p>
                      <p className="text-sm text-muted">支付方式：{order.paymentLabel}</p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="font-headline text-3xl text-primary">{formatPrice(order.amount)}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted">
                        {order.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
              {recentOrders.length === 0 ? (
                <p className="rounded-[1.75rem] bg-background px-5 py-8 text-sm text-muted">还没有订单数据。</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-outline-variant/10 bg-surface p-6 shadow-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Overview</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">后台速览</h2>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[1.5rem] bg-background p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">管理员账号</p>
                <p className="mt-3 text-sm font-medium text-foreground">{adminEmail}</p>
              </div>
              <div className="rounded-[1.5rem] bg-background p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">订单状态分布</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>已支付</span>
                    <span>{stats.paidOrders}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>待支付</span>
                    <span>{stats.pendingOrders}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>访客订单</span>
                    <span>{stats.guestOrders}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.5rem] bg-background p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">你现在能做什么</p>
                <div className="mt-4 space-y-2 text-sm leading-7 text-muted">
                  <p>查看注册用户和最近登录情况</p>
                  <p>查看订单金额、支付状态、联系邮箱</p>
                  <p>查看收货人和完整地址摘要</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Users</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">注册用户列表</h2>
            </div>
            <p className="text-sm text-muted">你这个 Gmail 管理员账号登录后就能直接查看这些信息。</p>
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
            {users.length === 0 ? <p className="py-8 text-sm text-muted">还没有注册用户数据。</p> : null}
          </div>
        </section>

        <section className="rounded-[2rem] border border-outline-variant/10 bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">All Orders</p>
              <h2 className="mt-2 font-headline text-3xl text-foreground">完整订单清单</h2>
            </div>
            <p className="text-sm text-muted">这里保留完整列表，方便你后续继续扩展搜索和筛选。</p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-2">商品</th>
                  <th className="px-4 py-2">金额</th>
                  <th className="px-4 py-2">状态</th>
                  <th className="px-4 py-2">支付</th>
                  <th className="px-4 py-2">联系邮箱</th>
                  <th className="px-4 py-2">收货信息</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="rounded-2xl bg-background align-top text-sm text-foreground">
                    <td className="rounded-l-2xl px-4 py-4">
                      <p className="font-medium text-foreground">{order.productName}</p>
                      <p className="mt-2 text-xs text-muted">{formatDateTime(order.createdAt)}</p>
                    </td>
                    <td className="px-4 py-4">{formatPrice(order.amount)}</td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(order.status)}`}>
                        {statusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-muted">{order.paymentLabel}</td>
                    <td className="px-4 py-4 text-muted">
                      <p>{order.contactEmail ?? "未提供"}</p>
                      <p className="mt-2 text-xs">{order.accountEmail ?? "访客下单"}</p>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-muted">
                      <p className="text-foreground">{order.shippingName}</p>
                      <p className="mt-2">{order.shippingSummary}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 ? <p className="py-8 text-sm text-muted">还没有订单数据。</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
