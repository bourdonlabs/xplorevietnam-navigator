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
