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
