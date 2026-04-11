"use client";

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
    return "None";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending_payment":
      return "Pending";
    case "submitted":
      return "Legacy";
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
    <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-muted">{label}</p>
      <p className={`mt-4 font-headline text-3xl sm:text-4xl ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
    </div>
  );
}

function MobileOrderCard({ order }: { order: AdminOrderRow }) {
  return (
    <article className="rounded-[1.25rem] bg-background p-4 shadow-[0_8px_24px_rgba(78,69,60,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{order.productName}</p>
          <p className="mt-1 text-xs text-muted">{formatDateTime(order.createdAt)}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(order.status)}`}>
          {statusLabel(order.status)}
        </span>
      </div>
      <div className="mt-4 space-y-2 text-sm text-muted">
        <p>Amount: {formatPrice(order.amount)}</p>
        <p>Payment: {order.paymentLabel}</p>
        <p>Contact: {order.contactEmail ?? "Not provided"}</p>
        <p>Account: {order.accountEmail ?? "Guest checkout"}</p>
        <p>Ship to: <span className="text-foreground">{order.shippingName}</span></p>
        <p>{order.shippingSummary}</p>
      </div>
    </article>
  );
}

function MobileUserCard({ user }: { user: AdminUserRow }) {
  return (
    <article className="rounded-[1.25rem] bg-background p-4 shadow-[0_8px_24px_rgba(78,69,60,0.06)]">
      <p className="font-medium text-foreground break-all">{user.email}</p>
      <div className="mt-4 space-y-2 text-sm text-muted">
        <p>Joined: {formatDateTime(user.createdAt)}</p>
        <p>Last sign-in: {formatDateTime(user.lastSignInAt)}</p>
        <p>Email confirmed: {user.emailConfirmedAt ? "Yes" : "No"}</p>
        <p>Orders: {user.orderCount}</p>
      </div>
    </article>
  );
}

export function AdminDashboard({ adminEmail, stats, users, orders }: AdminDashboardProps) {
  const recentOrders = orders.slice(0, 6);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(185,236,238,0.16),transparent_30%),linear-gradient(180deg,#f7f5f0_0%,#f3efe8_100%)]">
      <header className="border-b border-outline-variant/10 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted">Admin Console</p>
            <h1 className="mt-3 font-headline text-3xl italic text-foreground sm:text-4xl">ScentHome Admin</h1>
            <p className="mt-3 text-sm leading-7 text-muted break-all">Current admin: {adminEmail}</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <Link
              href="/"
              className="rounded-full bg-surface-high px-5 py-3 text-center text-sm font-medium text-muted transition hover:bg-surface-highest hover:text-foreground"
            >
              Back to home
            </Link>
            <SignOutButton className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <InfoCard label="Registered users" value={stats.totalUsers} />
          <InfoCard label="All orders" value={stats.totalOrders} />
          <InfoCard label="Confirmed revenue" value={formatPrice(stats.totalRevenue)} accent />
          <InfoCard label="Paid orders" value={stats.paidOrders} />
          <InfoCard label="Pending orders" value={stats.pendingOrders} />
          <InfoCard label="Guest orders" value={stats.guestOrders} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Orders</p>
                <h2 className="mt-2 font-headline text-2xl text-foreground sm:text-3xl">Recent orders</h2>
              </div>
              <p className="text-sm text-muted">Latest payment and shipping information.</p>
            </div>

            <div className="mt-6 grid gap-4">
              {recentOrders.map((order) => (
                <article key={order.id} className="rounded-[1.4rem] bg-background p-4 shadow-[0_8px_24px_rgba(78,69,60,0.06)] sm:rounded-[1.75rem] sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <p className="font-headline text-xl text-foreground sm:text-2xl">{order.productName}</p>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName(order.status)}`}>
                          {statusLabel(order.status)}
                        </span>
                      </div>
                      <p className="text-sm text-muted">Created: {formatDateTime(order.createdAt)}</p>
                      <p className="text-sm text-muted">Recipient: {order.shippingName}</p>
                      <p className="text-sm text-muted">Address: {order.shippingSummary}</p>
                      <p className="text-sm text-muted">Account: {order.accountEmail ?? "Guest checkout"}</p>
                      <p className="text-sm text-muted">Contact: {order.contactEmail ?? "Not provided"}</p>
                      <p className="text-sm text-muted">Payment: {order.paymentLabel}</p>
                    </div>
                    <div className="text-left lg:text-right">
                      <p className="font-headline text-2xl text-primary sm:text-3xl">{formatPrice(order.amount)}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted">{order.id.slice(0, 8)}</p>
                    </div>
                  </div>
                </article>
              ))}
              {recentOrders.length === 0 ? (
                <p className="rounded-[1.25rem] bg-background px-4 py-6 text-sm text-muted">No recent orders yet.</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-outline-variant/10 bg-surface p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Overview</p>
              <h2 className="mt-2 font-headline text-2xl text-foreground sm:text-3xl">Quick view</h2>
            </div>

            <div className="mt-6 space-y-4">
              <div className="rounded-[1.25rem] bg-background p-4 sm:rounded-[1.5rem] sm:p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Admin account</p>
                <p className="mt-3 break-all text-sm font-medium text-foreground">{adminEmail}</p>
              </div>
              <div className="rounded-[1.25rem] bg-background p-4 sm:rounded-[1.5rem] sm:p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Order status</p>
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>Paid</span>
                    <span>{stats.paidOrders}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>Pending</span>
                    <span>{stats.pendingOrders}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>Guest</span>
                    <span>{stats.guestOrders}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-[1.25rem] bg-background p-4 sm:rounded-[1.5rem] sm:p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">What you can check</p>
                <div className="mt-4 space-y-2 text-sm leading-7 text-muted">
                  <p>Registered users and last sign-ins</p>
                  <p>Payment amount, status, and contact email</p>
                  <p>Shipping recipient and address summary</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-outline-variant/10 bg-surface p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">Users</p>
              <h2 className="mt-2 font-headline text-2xl text-foreground sm:text-3xl">Registered users</h2>
            </div>
            <p className="text-sm text-muted">Mobile shows cards. Desktop keeps the table view.</p>
          </div>

          <div className="mt-6 space-y-4 md:hidden">
            {users.map((user) => (
              <MobileUserCard key={user.id} user={user} />
            ))}
            {users.length === 0 ? <p className="py-4 text-sm text-muted">No user data yet.</p> : null}
          </div>

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Joined</th>
                  <th className="px-4 py-2">Last sign-in</th>
                  <th className="px-4 py-2">Confirmed</th>
                  <th className="px-4 py-2">Orders</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="rounded-2xl bg-background text-sm text-foreground">
                    <td className="rounded-l-2xl px-4 py-4 break-all">{user.email}</td>
                    <td className="px-4 py-4 text-muted">{formatDateTime(user.createdAt)}</td>
                    <td className="px-4 py-4 text-muted">{formatDateTime(user.lastSignInAt)}</td>
                    <td className="px-4 py-4 text-muted">{user.emailConfirmedAt ? "Yes" : "No"}</td>
                    <td className="rounded-r-2xl px-4 py-4">{user.orderCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 ? <p className="py-8 text-sm text-muted">No user data yet.</p> : null}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-outline-variant/10 bg-surface p-5 shadow-sm sm:rounded-[2rem] sm:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted">All Orders</p>
              <h2 className="mt-2 font-headline text-2xl text-foreground sm:text-3xl">Full order list</h2>
            </div>
            <p className="text-sm text-muted">Desktop table plus a readable mobile card layout.</p>
          </div>

          <div className="mt-6 space-y-4 md:hidden">
            {orders.map((order) => (
              <MobileOrderCard key={order.id} order={order} />
            ))}
            {orders.length === 0 ? <p className="py-4 text-sm text-muted">No order data yet.</p> : null}
          </div>

          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="min-w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-muted">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">Amount</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Payment</th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2">Shipping</th>
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
                      <p>{order.contactEmail ?? "Not provided"}</p>
                      <p className="mt-2 text-xs">{order.accountEmail ?? "Guest checkout"}</p>
                    </td>
                    <td className="rounded-r-2xl px-4 py-4 text-muted">
                      <p className="text-foreground">{order.shippingName}</p>
                      <p className="mt-2">{order.shippingSummary}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 ? <p className="py-8 text-sm text-muted">No order data yet.</p> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
