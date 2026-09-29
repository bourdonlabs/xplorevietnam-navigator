-- XploreVietnam Navigator: full database setup in one paste (0001 + 0002 + 0003).
-- Paste this whole file into Supabase > SQL Editor > New query > Run, once, on a fresh project.

-- ===== migrations/0001_init.sql =====
-- XploreVietnam Navigator: initial schema
-- Paste into Supabase > SQL Editor and run once (or `supabase db push`).
--
-- V1 uses: profiles, journey_progress.
-- Built now so client cases slot in without a rebuild: staff, cases, case_steps, case_documents, case_updates
-- and a private storage bucket for client documents.

-- ───────────────────────── Staff ─────────────────────────
-- Anyone in this table can see and update every client's cases. Only added from the dashboard / service role.
create table public.staff (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  title      text,
  email      text,
  whatsapp   text,
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.staff where user_id = auth.uid());
$$;

-- ───────────────────────── Profiles ─────────────────────────
-- One row per client. Filled by the 8-step onboarding.
create table public.profiles (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  email                 text,
  first_name            text,
  last_name             text,
  nationality           text,
  country_of_residence  text,
  move_stage            text check (move_stage in ('researching', 'planning', 'moving_soon', 'moved')),
  anticipated_move_date date,
  visa_type             text check (visa_type in ('evisa', 'work', 'investor', 'family', 'unsure')),
  has_sponsor           boolean,
  sponsor_type          text,
  onboarded_at          timestamptz,
  ghl_contact_id        text, -- written by the GoHighLevel sync (service role), never by the client
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Journey checklist ticks.
create table public.journey_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  item_id      int  not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

-- ───────────────────────── Cases ─────────────────────────
-- One case per service a client buys: TRC, work permit, overstay review, tax code, a relocation package...
-- Staff move it through the statuses; the client sees it live in Navigator.
create type public.case_status as enum (
  'new', 'awaiting_documents', 'in_review', 'submitted', 'appointment', 'processing', 'approved', 'completed', 'on_hold', 'cancelled'
);

create table public.cases (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references auth.users (id) on delete cascade,
  service     text not null, -- e.g. trc, work_permit, evisa, investor, family, overstay_review, tax_code, bank_account, visa_review, package_visa, package_get_to_vietnam, package_concierge, teacher
  title       text not null,
  status      public.case_status not null default 'new',
  assigned_to uuid references public.staff (user_id) on delete set null,
  next_action text, -- shown to the client, e.g. "Upload your legalised degree"
  opened_at   timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz
);
create index cases_client_idx on public.cases (client_id);

create table public.case_steps (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases (id) on delete cascade,
  position     int  not null,
  title        text not null,
  status       text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'blocked')),
  due_date     date,
  completed_at timestamptz,
  client_note  text
);
create index case_steps_case_idx on public.case_steps (case_id);

-- Documents staff request; the client uploads into storage bucket client-docs at {client_id}/{case_id}/{file}.
create table public.case_documents (
  id           uuid primary key default gen_random_uuid(),
  case_id      uuid not null references public.cases (id) on delete cascade,
  name         text not null,
  required     boolean not null default true,
  status       text not null default 'requested' check (status in ('requested', 'uploaded', 'approved', 'rejected')),
  file_path    text,
  staff_note   text,
  requested_at timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index case_documents_case_idx on public.case_documents (case_id);

-- Case timeline. internal = staff-only note.
create table public.case_updates (
  id         uuid primary key default gen_random_uuid(),
  case_id    uuid not null references public.cases (id) on delete cascade,
  author_id  uuid references auth.users (id) on delete set null,
  body       text not null,
  internal   boolean not null default false,
  created_at timestamptz not null default now()
);
create index case_updates_case_idx on public.case_updates (case_id);

create or replace function public.owns_case(cid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.cases where id = cid and client_id = auth.uid());
$$;

-- ───────────────────────── Triggers ─────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch       before update on public.profiles       for each row execute function public.touch_updated_at();
create trigger cases_touch          before update on public.cases          for each row execute function public.touch_updated_at();
create trigger case_documents_touch before update on public.case_documents for each row execute function public.touch_updated_at();

-- Every new account gets a profile row.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email) values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.staff            enable row level security;
alter table public.profiles         enable row level security;
alter table public.journey_progress enable row level security;
alter table public.cases            enable row level security;
alter table public.case_steps       enable row level security;
alter table public.case_documents   enable row level security;
alter table public.case_updates     enable row level security;

-- Staff directory is readable by signed-in users (clients see their specialist's name). No client writes.
create policy staff_read on public.staff for select to authenticated using (true);

-- Profiles: a client reads and edits only their own; staff read and edit all.
create policy profiles_read   on public.profiles for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy profiles_insert on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy profiles_update on public.profiles for update to authenticated
  using (user_id = auth.uid() or public.is_staff())
  with check (user_id = auth.uid() or public.is_staff());
-- Clients can't touch the CRM link. (user_id is updatable only so upserts work; RLS stops it changing.)
revoke insert, update on public.profiles from authenticated;
grant insert (user_id, email, first_name, last_name, nationality, country_of_residence, move_stage, anticipated_move_date,
              visa_type, has_sponsor, sponsor_type, onboarded_at) on public.profiles to authenticated;
grant update (user_id, email, first_name, last_name, nationality, country_of_residence, move_stage, anticipated_move_date,
              visa_type, has_sponsor, sponsor_type, onboarded_at) on public.profiles to authenticated;

-- Journey ticks: own rows only; staff can read.
create policy progress_own on public.journey_progress for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy progress_staff_read on public.journey_progress for select to authenticated using (public.is_staff());

-- Cases and steps: client reads own; only staff write.
create policy cases_read  on public.cases for select to authenticated using (client_id = auth.uid() or public.is_staff());
create policy cases_write on public.cases for all    to authenticated using (public.is_staff()) with check (public.is_staff());

create policy steps_read  on public.case_steps for select to authenticated using (public.owns_case(case_id) or public.is_staff());
create policy steps_write on public.case_steps for all    to authenticated using (public.is_staff()) with check (public.is_staff());

-- Documents: client reads own and can mark a requested document as uploaded; staff do everything else.
create policy docs_read  on public.case_documents for select to authenticated using (public.owns_case(case_id) or public.is_staff());
create policy docs_staff on public.case_documents for all    to authenticated using (public.is_staff()) with check (public.is_staff());
create policy docs_client_upload on public.case_documents for update to authenticated
  using (public.owns_case(case_id) and status in ('requested', 'rejected'))
  with check (public.owns_case(case_id) and status = 'uploaded');

-- Timeline: client sees non-internal updates on own cases; staff post.
create policy updates_read  on public.case_updates for select to authenticated
  using ((public.owns_case(case_id) and not internal) or public.is_staff());
create policy updates_write on public.case_updates for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- ───────────────────────── Storage ─────────────────────────
insert into storage.buckets (id, name, public) values ('client-docs', 'client-docs', false)
on conflict (id) do nothing;

create policy client_docs_own on storage.objects for all to authenticated
  using (bucket_id = 'client-docs' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'client-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy client_docs_staff on storage.objects for all to authenticated
  using (bucket_id = 'client-docs' and public.is_staff())
  with check (bucket_id = 'client-docs' and public.is_staff());

-- ===== migrations/0002_visa_documents.sql =====
-- XploreVietnam Navigator: Visa checklist uploads, dependents, service requests (run after 0001)

-- City the client will live in and file from.
alter table public.profiles add column destination_city text;
grant insert (destination_city), update (destination_city) on public.profiles to authenticated;

-- Dependents (spouse / children) who need their own documents.
create table public.dependents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  full_name  text not null,
  created_at timestamptz not null default now()
);
create index dependents_user_idx on public.dependents (user_id);

-- One row per uploaded file. applicant_id null = main applicant.
-- File lives in storage bucket client-docs at {user_id}/visa/{applicant}/{doc_key}/{file}.
create table public.visa_documents (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  applicant_id uuid references public.dependents (id) on delete cascade,
  doc_key      text not null,
  file_path    text not null,
  file_name    text not null,
  size_bytes   int  not null check (size_bytes > 0 and size_bytes <= 4194304),
  created_at   timestamptz not null default now()
);
create index visa_documents_user_idx on public.visa_documents (user_id);

-- Max 5 files per document per applicant.
create or replace function public.visa_documents_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.visa_documents
      where user_id = new.user_id and doc_key = new.doc_key
        and applicant_id is not distinct from new.applicant_id) >= 5 then
    raise exception 'Maximum of 5 files per document';
  end if;
  return new;
end $$;
create trigger visa_documents_limit before insert on public.visa_documents
  for each row execute function public.visa_documents_limit();

-- Paid or requested individual services: visa packet review, tax code, bank account...
-- Clients can create a request; only staff (or the Stripe webhook, with the service role) change its status.
create table public.service_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  service           text not null,  -- visa_review, tax_code, bank_account
  quantity          int  not null default 1,
  dependents        int  not null default 0,
  amount_usd        int  not null,
  status            text not null default 'requested' check (status in ('requested', 'paid', 'in_progress', 'completed', 'cancelled')),
  stripe_session_id text unique,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index service_requests_user_idx on public.service_requests (user_id);
create trigger service_requests_touch before update on public.service_requests
  for each row execute function public.touch_updated_at();

-- ───────── RLS ─────────
alter table public.dependents       enable row level security;
alter table public.visa_documents   enable row level security;
alter table public.service_requests enable row level security;

create policy dependents_own   on public.dependents for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy dependents_staff on public.dependents for select to authenticated using (public.is_staff());

-- Clients add and remove their own files but never edit a row in place; staff can do anything.
create policy vdocs_read   on public.visa_documents for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy vdocs_insert on public.visa_documents for insert to authenticated
  with check (
    user_id = auth.uid()
    and split_part(file_path, '/', 1) = auth.uid()::text
    and (applicant_id is null or exists (select 1 from public.dependents d where d.id = applicant_id and d.user_id = auth.uid()))
  );
create policy vdocs_delete on public.visa_documents for delete to authenticated using (user_id = auth.uid() or public.is_staff());
create policy vdocs_staff  on public.visa_documents for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy requests_read   on public.service_requests for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy requests_insert on public.service_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'requested' and stripe_session_id is null);
create policy requests_staff  on public.service_requests for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Storage: only PDF / PNG / JPEG, 4MB max.
update storage.buckets
set file_size_limit = 4194304,
    allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg']
where id = 'client-docs';

-- ===== migrations/0003_tools.sql =====
-- XploreVietnam Navigator: saved Cost of Living Calculator answers and Pre-Arrival Checklist ticks (run after 0002)

create table public.cost_calculations (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  inputs     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create trigger cost_calculations_touch before update on public.cost_calculations
  for each row execute function public.touch_updated_at();

create table public.checklist_items (
  user_id      uuid not null references auth.users (id) on delete cascade,
  item_key     text not null,
  completed_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

alter table public.cost_calculations enable row level security;
alter table public.checklist_items   enable row level security;

create policy cost_own        on public.cost_calculations for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cost_staff_read on public.cost_calculations for select to authenticated using (public.is_staff());
create policy checklist_own        on public.checklist_items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy checklist_staff_read on public.checklist_items for select to authenticated using (public.is_staff());

-- ===== migrations/0004_avatar.sql =====
-- Profile photo. The image lives in the private client-docs bucket at {user_id}/avatar/{timestamp}.jpg,
-- covered by the existing own-folder and staff policies; the profile row stores its path.
alter table public.profiles add column if not exists avatar_path text;
grant insert (avatar_path), update (avatar_path) on public.profiles to authenticated;

-- ===== migrations/0005_admin.sql =====
-- XploreVietnam Navigator: admin area (run after 0004).
-- Staff-only tables clients can never read: a sales pipeline stage per client and internal notes.
-- Plus one function that lets staff see sign-in activity (email confirmed, last sign-in) from auth.users.

-- ───────── Pipeline: where each client stands with us ─────────
create table public.client_pipeline (
  client_id   uuid primary key references auth.users (id) on delete cascade,
  stage       text not null default 'new'
              check (stage in ('new', 'contacted', 'consultation', 'proposal', 'client', 'lost')),
  assigned_to uuid references public.staff (user_id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid default auth.uid()
);
create trigger client_pipeline_touch before update on public.client_pipeline
  for each row execute function public.touch_updated_at();

-- ───────── Internal notes (never shown to the client) ─────────
create table public.client_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references auth.users (id) on delete cascade,
  author_id  uuid default auth.uid() references public.staff (user_id) on delete set null,
  body       text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index client_notes_client_idx on public.client_notes (client_id, created_at desc);

alter table public.client_pipeline enable row level security;
alter table public.client_notes    enable row level security;

create policy pipeline_staff on public.client_pipeline for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy notes_staff_read   on public.client_notes for select to authenticated using (public.is_staff());
create policy notes_staff_insert on public.client_notes for insert to authenticated
  with check (public.is_staff() and author_id = auth.uid());
-- Staff can delete their own notes only.
create policy notes_staff_delete on public.client_notes for delete to authenticated
  using (public.is_staff() and author_id = auth.uid());

revoke all on public.client_pipeline, public.client_notes from anon;

-- ───────── Sign-in activity for the admin clients list ─────────
-- Returns nothing unless the caller is staff.
create or replace function public.admin_auth_activity()
returns table (user_id uuid, email_confirmed_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer
set search_path = public, auth
as $$
  select u.id, u.email_confirmed_at, u.last_sign_in_at
  from auth.users u
  where public.is_staff();
$$;
revoke all on function public.admin_auth_activity() from public, anon;
grant execute on function public.admin_auth_activity() to authenticated;

-- ───────── Per-client activity counts for the admin clients list ─────────
-- security_invoker: the caller's own row rules apply (staff see everyone, a client only themself).
create view public.client_activity with (security_invoker = true) as
select p.user_id,
       (select count(*) from public.visa_documents d  where d.user_id = p.user_id)::int as docs,
       (select count(*) from public.checklist_items c where c.user_id = p.user_id)::int as checklist,
       (select count(*) from public.journey_progress j where j.user_id = p.user_id)::int as journey,
       (select count(*) from public.dependents x     where x.user_id = p.user_id)::int as dependents
from public.profiles p;
revoke all on public.client_activity from anon;
grant select on public.client_activity to authenticated;

-- ===== migrations/0006_website.sql =====
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
