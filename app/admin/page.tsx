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
  user_metadata?: Record<string, unknown> | null;
};

type OrderRecord = {
  id: string;
  user_id: string | null;
  product_name: string;
  amount: number | string;
  status: string;
  shipping_address: Record<string, unknown> | null;
  created_at: string | null;
};

function asText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function buildShippingName(shippingAddress: Record<string, unknown> | null) {
  const firstName = asText(shippingAddress?.first_name);
  const lastName = asText(shippingAddress?.last_name);
  const fullName = [lastName, firstName].filter(Boolean).join("");

  return fullName || "未提供";
}

function buildShippingSummary(shippingAddress: Record<string, unknown> | null) {
  const city = asText(shippingAddress?.city);
  const street = asText(shippingAddress?.street);
  const country = asText(shippingAddress?.country);

  return [country, city, street].filter(Boolean).join(" · ") || "未提供";
}

function buildContactEmail(shippingAddress: Record<string, unknown> | null) {
  return asText(shippingAddress?.email);
}

function parseAmount(value: number | string) {
  if (typeof value === "number") {
    return value;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
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
            要查看所有注册用户和全部订单，需要在环境变量里补上
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
    .select("id, user_id, product_name, amount, status, shipping_address, created_at")
    .order("created_at", { ascending: false });

  if (ordersError) {
    throw new Error(ordersError.message);
  }

  const orders = ((ordersData ?? []) as OrderRecord[]).map((order) => order);
  const userEmailById = new Map(
    allUsers.map((account) => [account.id, account.email ?? null] as const),
  );
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
    contactEmail: buildContactEmail(order.shipping_address),
    productName: order.product_name,
    amount: parseAmount(order.amount),
    status: order.status,
    createdAt: order.created_at,
    shippingName: buildShippingName(order.shipping_address),
    shippingSummary: buildShippingSummary(order.shipping_address),
  }));

  const stats = {
    totalUsers: users.length,
    totalOrders: adminOrders.length,
    guestOrders: adminOrders.filter((order) => !order.accountEmail).length,
    totalRevenue: adminOrders.reduce((sum, order) => sum + order.amount, 0),
  };

  return <AdminDashboard adminEmail={user.email ?? "管理员"} stats={stats} users={users} orders={adminOrders} />;
}
