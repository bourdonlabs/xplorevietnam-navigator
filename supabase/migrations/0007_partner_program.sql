-- XploreVietnam: partner program, referral and affiliate (run after 0006).
-- A partner is a normal Navigator account (auth.users) with one row in `partners`: a coupon code, a share link,
-- a commission rate and payout details. Rates are set by staff only; partners can change just their own payout details.
--
--   partners             one row per partner. Created only through register_partner(), which fixes the starting rates.
--   partner_visits       one row per tracked landing on a ?ref=CODE link (clicks).
--   partner_commissions  one row per paid website order that used a code. Written by the Stripe webhook (service role).
--   partner_summary      per-partner totals for the dashboard and the admin list.
--
-- Rows are protected by row level security: a partner reads only their own data, staff read everything.

create table public.partners (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references auth.users (id) on delete cascade,
  program           text not null default 'referral' check (program in ('referral', 'affiliate')),
  username          text not null unique check (username ~ '^[a-z0-9][a-z0-9_.-]{2,29}$'),
  code              text not null unique check (code ~ '^[A-Z0-9]{3,20}$'),
  name              text check (length(name) <= 200),
  email             text,
  paypal_email      text check (length(paypal_email) <= 320),
  payout_method     text not null default 'paypal' check (payout_method in ('paypal', 'bank')),
  bank_details      text check (length(bank_details) <= 1000),
  promote_via       text check (length(promote_via) <= 200),
  content_url       text check (length(content_url) <= 300),
  commission_rate   numeric(5,4) not null default 0.05 check (commission_rate between 0 and 0.5),
  customer_discount numeric(5,4) not null default 0.05 check (customer_discount between 0 and 0.5),
  status            text not null default 'active' check (status in ('active', 'suspended')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger partners_touch before update on public.partners
  for each row execute function public.touch_updated_at();

create table public.partner_visits (
  id         bigint generated always as identity primary key,
  partner_id uuid not null references public.partners (id) on delete cascade,
  page       text check (length(page) <= 300),
  created_at timestamptz not null default now()
);
create index partner_visits_partner_idx on public.partner_visits (partner_id, created_at desc);

-- Which code (if any) a website order used, so staff can see it on the orders list.
alter table public.orders add column partner_code text;

create table public.partner_commissions (
  id                uuid primary key default gen_random_uuid(),
  partner_id        uuid not null references public.partners (id) on delete restrict,
  order_id          uuid references public.orders (id) on delete set null,
  stripe_session_id text not null unique,               -- one commission per checkout, even if Stripe retries the webhook
  sale_usd          numeric(12,2) not null,             -- what the customer actually paid at checkout, after their discount
  rate              numeric(5,4) not null,              -- the partner's rate at the time of the sale
  commission_usd    numeric(12,2) not null,
  status            text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  payable_on        date not null,                      -- 30 days after the purchase; "payable" = pending and this date reached
  paid_at           timestamptz,
  payout_ref        text,                               -- PayPal transaction id or bank transfer reference
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index partner_commissions_partner_idx on public.partner_commissions (partner_id, created_at desc);
create trigger partner_commissions_touch before update on public.partner_commissions
  for each row execute function public.touch_updated_at();

alter table public.partners            enable row level security;
alter table public.partner_visits      enable row level security;
alter table public.partner_commissions enable row level security;

revoke all on public.partners, public.partner_visits, public.partner_commissions from anon, authenticated;
grant select on public.partners, public.partner_visits, public.partner_commissions to authenticated;
-- Partners may edit only their own payout and profile details. Rates, program and status are staff-only (admin_update_partner).
grant update (name, paypal_email, payout_method, bank_details, promote_via, content_url) on public.partners to authenticated;
-- Staff record payouts; the policy below limits this to staff.
grant update (status, paid_at, payout_ref, note) on public.partner_commissions to authenticated;

create policy partners_read   on public.partners for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy partners_update on public.partners for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy visits_read on public.partner_visits for select to authenticated
  using (public.is_staff() or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));

create policy commissions_read on public.partner_commissions for select to authenticated
  using (public.is_staff() or exists (select 1 from public.partners p where p.id = partner_id and p.user_id = auth.uid()));
create policy commissions_staff_update on public.partner_commissions for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ───────── Totals per partner (dashboard and admin list) ─────────
-- security_invoker: the caller's own row rules apply, so a partner sees only their row and staff see all.
create view public.partner_summary with (security_invoker = true) as
select p.id as partner_id,
       (select count(*) from public.partner_visits v where v.partner_id = p.id)::int as visits,
       (select count(*) from public.partner_commissions c where c.partner_id = p.id and c.status <> 'void')::int as sales,
       coalesce((select sum(c.sale_usd) from public.partner_commissions c where c.partner_id = p.id and c.status <> 'void'), 0) as sales_usd,
       coalesce((select sum(c.commission_usd) from public.partner_commissions c where c.partner_id = p.id and c.status = 'pending' and c.payable_on > current_date), 0) as pending_usd,
       coalesce((select sum(c.commission_usd) from public.partner_commissions c where c.partner_id = p.id and c.status = 'pending' and c.payable_on <= current_date), 0) as payable_usd,
       coalesce((select sum(c.commission_usd) from public.partner_commissions c where c.partner_id = p.id and c.status = 'paid'), 0) as paid_usd
from public.partners p;
revoke all on public.partner_summary from anon;
grant select on public.partner_summary to authenticated;

-- ───────── Functions ─────────

-- Creates the signed-in user's partner account. Rates always start at the program defaults (5% commission, 5% off).
-- Raises: not_signed_in, bad_username, bad_code, code_taken, username_taken.
create or replace function public.register_partner(
  p_username     text,
  p_code         text,
  p_name         text default null,
  p_paypal_email text default null,
  p_promote_via  text default null,
  p_content_url  text default null
) returns public.partners
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_user  text := lower(btrim(coalesce(p_username, '')));
  v_code  text := upper(btrim(coalesce(p_code, '')));
  v_email text;
  v_row   public.partners;
begin
  if v_uid is null then raise exception 'not_signed_in'; end if;
  select * into v_row from public.partners where user_id = v_uid;
  if found then return v_row; end if;

  if v_user !~ '^[a-z0-9][a-z0-9_.-]{2,29}$' then raise exception 'bad_username'; end if;
  if v_code !~ '^[A-Z0-9]{3,20}$' then raise exception 'bad_code'; end if;
  if v_code = any (array['XPLORE', 'XPLOREVIETNAM', 'XPLOREVN', 'VIETNAM', 'ADMIN', 'STAFF', 'TEAM', 'FREE', 'TEST', 'PARTNER', 'DISCOUNT', 'COUPON']) then
    raise exception 'code_taken';
  end if;

  select email into v_email from auth.users where id = v_uid;
  begin
    insert into public.partners (user_id, username, code, name, email, paypal_email, promote_via, content_url)
    values (v_uid, v_user, v_code, nullif(btrim(p_name), ''), v_email, nullif(btrim(p_paypal_email), ''),
            nullif(btrim(p_promote_via), ''), nullif(btrim(p_content_url), ''))
    returning * into v_row;
  exception when unique_violation then
    select * into v_row from public.partners where user_id = v_uid;   -- a double submit: already created
    if found then return v_row; end if;
    if exists (select 1 from public.partners where code = v_code) then raise exception 'code_taken'; end if;
    raise exception 'username_taken';
  end;
  return v_row;
end;
$$;

-- Is this username and coupon code free? Used by the website sign-up before it creates the account.
create or replace function public.partner_available(p_username text, p_code text)
returns jsonb
language sql stable security definer
set search_path = public
as $$
  select jsonb_build_object(
    'username_ok', not exists (select 1 from public.partners where username = lower(btrim(coalesce(p_username, '')))),
    'code_ok', not exists (select 1 from public.partners where code = upper(btrim(coalesce(p_code, ''))))
      and upper(btrim(coalesce(p_code, ''))) <> all (array['XPLORE', 'XPLOREVIETNAM', 'XPLOREVN', 'VIETNAM', 'ADMIN', 'STAFF', 'TEAM', 'FREE', 'TEST', 'PARTNER', 'DISCOUNT', 'COUPON'])
  );
$$;

-- Coupon check at checkout: the customer's discount for an active partner's code, nothing for any other code.
create or replace function public.partner_by_code(p_code text)
returns table (id uuid, code text, customer_discount numeric)
language sql stable security definer
set search_path = public
as $$
  select p.id, p.code, p.customer_discount
  from public.partners p
  where p.code = upper(btrim(coalesce(p_code, ''))) and p.status = 'active';
$$;

-- One click on a partner's ?ref=CODE link. Unknown or suspended codes are ignored.
create or replace function public.track_partner_visit(p_code text, p_page text default null)
returns void
language sql security definer
set search_path = public
as $$
  insert into public.partner_visits (partner_id, page)
  select p.id, left(p_page, 300) from public.partners p
  where p.code = upper(btrim(coalesce(p_code, ''))) and p.status = 'active';
$$;

-- Staff change a partner's program, rates and status (partners cannot touch these themselves).
create or replace function public.admin_update_partner(
  p_id       uuid,
  p_program  text,
  p_rate     numeric,
  p_discount numeric,
  p_status   text
) returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not public.is_staff() then raise exception 'staff_only'; end if;
  update public.partners
     set program = p_program, commission_rate = p_rate, customer_discount = p_discount, status = p_status
   where id = p_id;
end;
$$;

revoke all on function public.register_partner(text, text, text, text, text, text) from public, anon;
revoke all on function public.partner_available(text, text)  from public;
revoke all on function public.partner_by_code(text)          from public;
revoke all on function public.track_partner_visit(text, text) from public;
revoke all on function public.admin_update_partner(uuid, text, numeric, numeric, text) from public, anon;
grant execute on function public.register_partner(text, text, text, text, text, text) to authenticated;
grant execute on function public.partner_available(text, text)   to anon, authenticated;
grant execute on function public.partner_by_code(text)           to anon, authenticated;
grant execute on function public.track_partner_visit(text, text) to anon, authenticated;
grant execute on function public.admin_update_partner(uuid, text, numeric, numeric, text) to authenticated;
