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
