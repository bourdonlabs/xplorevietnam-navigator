-- XploreVietnam: website leads and online orders (run after 0005).
-- Leads: contact, free-call requests, newsletter, city quiz, order requests. Anyone may submit one (through the
-- Navigator's /api/leads endpoint); only staff can read or change them.
-- Orders: paid Stripe checkouts from the website cart, written by the Stripe webhook (service role). Staff only.

create table public.website_leads (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('contact', 'consultation', 'newsletter', 'quiz', 'order_request')),
  name       text check (length(name) <= 200),
  email      text not null check (length(email) <= 320 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  phone      text check (length(phone) <= 60),
  message    text check (length(message) <= 5000),
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) <= 8000),
  page       text check (length(page) <= 300),
  status     text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index website_leads_created_idx on public.website_leads (created_at desc);
create trigger website_leads_touch before update on public.website_leads
  for each row execute function public.touch_updated_at();

create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  stripe_session_id text not null unique,
  email             text,
  name              text,
  phone             text,
  address           jsonb,
  items             jsonb not null,           -- [{sku, name, qty, dependents, addons, amount_usd}]
  amount_total      int  not null,            -- in cents, as charged by Stripe
  currency          text not null default 'usd',
  status            text not null default 'paid' check (status in ('paid', 'in_progress', 'completed', 'refunded', 'cancelled')),
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index orders_created_idx on public.orders (created_at desc);
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

alter table public.website_leads enable row level security;
alter table public.orders        enable row level security;

-- Public can only add a fresh lead; they can never read, edit or delete one.
create policy leads_insert on public.website_leads for insert to anon, authenticated
  with check (status = 'new' and note is null);
create policy leads_staff on public.website_leads for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy orders_staff_read   on public.orders for select to authenticated using (public.is_staff());
create policy orders_staff_update on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());

revoke all on public.orders from anon;
revoke select, update, delete on public.website_leads from anon;
grant insert on public.website_leads to anon;
