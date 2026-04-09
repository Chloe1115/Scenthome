create extension if not exists "pgcrypto";

create table if not exists public.scent_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  narrative text not null,
  summary text not null,
  emotion_tags text[] not null default '{}',
  scent_tags text[] not null default '{}',
  image_path text,
  source_image_name text,
  profile_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.profile_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  profile_id uuid references public.scent_profiles(id) on delete set null,
  feedback_value text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  profile_id uuid references public.scent_profiles(id) on delete cascade,
  contact_email text,
  product_name text not null,
  amount numeric(10, 2) not null,
  status text not null default 'submitted',
  shipping_address jsonb not null default '{}'::jsonb,
  payment_summary jsonb not null default '{}'::jsonb,
  profile_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.scent_profiles enable row level security;
alter table public.profile_feedback enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Users can view own scent profiles" on public.scent_profiles;
create policy "Users can view own scent profiles"
  on public.scent_profiles
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own scent profiles" on public.scent_profiles;
create policy "Users can insert own scent profiles"
  on public.scent_profiles
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can create own orders" on public.orders;
create policy "Users can create own orders"
  on public.orders
  for insert
  to authenticated
  with check (user_id is null or auth.uid() = user_id);

drop policy if exists "Guests can create orders" on public.orders;
create policy "Guests can create orders"
  on public.orders
  for insert
  to anon
  with check (true);

drop policy if exists "Authenticated users can write feedback" on public.profile_feedback;
create policy "Authenticated users can write feedback"
  on public.profile_feedback
  for insert
  to authenticated
  with check (true);

drop policy if exists "Anonymous feedback is allowed" on public.profile_feedback;
create policy "Anonymous feedback is allowed"
  on public.profile_feedback
  for insert
  to anon
  with check (true);

drop policy if exists "Users can view their feedback" on public.profile_feedback;
create policy "Users can view their feedback"
  on public.profile_feedback
  for select
  to authenticated
  using (auth.uid() = user_id or user_id is null);

insert into storage.buckets (id, name, public)
values ('memory-images', 'memory-images', false)
on conflict (id) do nothing;

drop policy if exists "Authenticated users can upload memory images" on storage.objects;
create policy "Authenticated users can upload memory images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'memory-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Authenticated users can read their memory images" on storage.objects;
create policy "Authenticated users can read their memory images"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'memory-images'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
