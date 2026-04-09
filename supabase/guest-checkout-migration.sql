alter table public.orders alter column user_id drop not null;
alter table public.orders alter column profile_id drop not null;

alter table public.orders
  add column if not exists contact_email text;

alter table public.orders
  add column if not exists profile_snapshot jsonb not null default '{}'::jsonb;

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
