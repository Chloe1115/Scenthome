import { redirect } from "next/navigation";

import {
  AdminDashboard,
  type AdminOrderRow,
  type AdminUserRow,
} from "@/components/admin-dashboard";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AuthAdminUser = {
  id: string;
  email?: string | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
  email_confirmed_at?: string | null;
};

type OrderRecord = {
  id: string;
  user_id: string | null;
  product_name: string;
  amount: number | string;
  status: string;
  shipping_address: Record<string, unknown> | null;
  payment_summary: Record<string, unknown> | null;
  created_at: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function buildShippingName(shippingAddress: Record<string, unknown> | null) {
  const firstName = asText(shippingAddress?.first_name);
  const lastName = asText(shippingAddress?.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return fullName || "未提供";
}

function buildShippingSummary(shippingAddress: Record<string, unknown> | null) {
  const country = asText(shippingAddress?.country);
  const city = asText(shippingAddress?.city);
  const street = asText(shippingAddress?.street);
  const postalCode = asText(shippingAddress?.postal_code);

  return [country, city, street, postalCode].filter(Boolean).join(" · ") || "未提供";
}

function buildContactEmail(order: OrderRecord) {
  return asText(order.shipping_address?.email);
}

function parseAmount(value: number | string) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function buildPaymentLabel(paymentSummary: Record<string, unknown> | null, status: string) {
  const summary = asObject(paymentSummary);
  const paymentStatus = asText(summary?.payment_status);
  const brand = asText(summary?.brand);
  const last4 = asText(summary?.last4);

  if (paymentStatus === "paid" && brand && last4) {
    return `${brand.toUpperCase()} ···· ${last4}`;
  }

  if (paymentStatus === "paid") {
    return "Stripe 已支付";
  }

  if (paymentStatus === "pending") {
    return "等待支付";
  }

  if (status === "submitted") {
    return "旧版订单";
  }

  return "未提供";
}

async function listAllUsers(adminClient: NonNullable<ReturnType<typeof createSupabaseAdminClient>>) {
  const allUsers: AuthAdminUser[] = [];
  let page = 1;

  while (page <= 10) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const users = (data?.users ?? []) as AuthAdminUser[];
    allUsers.push(...users);

    if (users.length < 100) {
      break;
    }

    page += 1;
  }

  return allUsers;
}

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-xl rounded-[2rem] bg-surface p-10 shadow-ambient">
          <h1 className="font-headline text-4xl text-foreground">后台暂时不可用</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            还没有配置 Supabase 前端环境变量，所以暂时无法识别管理员登录状态。
          </p>
        </div>
      </main>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?next=%2Fadmin");
  }

  if (!isAdminEmail(user.email)) {
    redirect("/");
  }

  const adminClient = createSupabaseAdminClient();

  if (!adminClient) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-2xl rounded-[2rem] bg-surface p-10 shadow-ambient">
          <h1 className="font-headline text-4xl text-foreground">后台配置还差一步</h1>
          <p className="mt-4 text-sm leading-7 text-muted">
            要查看所有注册用户和全部订单，需要补上
            <code className="mx-1 rounded bg-surface-high px-2 py-1 text-foreground">SUPABASE_SERVICE_ROLE_KEY</code>
            和
            <code className="mx-1 rounded bg-surface-high px-2 py-1 text-foreground">ADMIN_EMAILS</code>。
          </p>
        </div>
      </main>
    );
  }

  const allUsers = await listAllUsers(adminClient);

  const { data: ordersData, error: ordersError } = await adminClient
    .from("orders")
    .select("id, user_id, product_name, amount, status, shipping_address, payment_summary, created_at")
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orders = (ordersData ?? []) as OrderRecord[];
  const userEmailById = new Map(allUsers.map((account) => [account.id, account.email ?? null] as const));
  const ordersCountByUser = new Map<string, number>();

  orders.forEach((order) => {
    if (!order.user_id) {
      return;
    }

    ordersCountByUser.set(order.user_id, (ordersCountByUser.get(order.user_id) ?? 0) + 1);
  });

  const users: AdminUserRow[] = allUsers
    .filter((account) => Boolean(account.email))
    .sort((a, b) => {
      const left = a.created_at ? new Date(a.created_at).getTime() : 0;
      const right = b.created_at ? new Date(b.created_at).getTime() : 0;
      return right - left;
    })
    .map((account) => ({
      id: account.id,
      email: account.email ?? "未提供邮箱",
      createdAt: account.created_at ?? null,
      lastSignInAt: account.last_sign_in_at ?? null,
      emailConfirmedAt: account.email_confirmed_at ?? null,
      orderCount: ordersCountByUser.get(account.id) ?? 0,
    }));

  const adminOrders: AdminOrderRow[] = orders.map((order) => ({
    id: order.id,
    accountEmail: order.user_id ? userEmailById.get(order.user_id) ?? null : null,
    contactEmail: buildContactEmail(order),
    productName: order.product_name,
    amount: parseAmount(order.amount),
    status: order.status,
    paymentLabel: buildPaymentLabel(order.payment_summary, order.status),
    createdAt: order.created_at,
    shippingName: buildShippingName(order.shipping_address),
    shippingSummary: buildShippingSummary(order.shipping_address),
  }));

  const paidOrders = adminOrders.filter((order) => order.status === "paid").length;
  const pendingOrders = adminOrders.filter((order) => order.status === "pending_payment").length;
  const guestOrders = adminOrders.filter((order) => !order.accountEmail).length;
  const totalRevenue = adminOrders.reduce((sum, order) => {
    if (order.status !== "paid" && order.status !== "submitted") {
      return sum;
    }

    return sum + order.amount;
  }, 0);

  return (
    <AdminDashboard
      adminEmail={user.email ?? "管理员"}
      stats={{
        totalUsers: users.length,
        totalOrders: adminOrders.length,
        paidOrders,
        pendingOrders,
        guestOrders,
        totalRevenue,
      }}
      users={users}
      orders={adminOrders}
    />
  );
}
