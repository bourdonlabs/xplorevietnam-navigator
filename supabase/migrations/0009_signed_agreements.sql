-- XploreVietnam: e-signed service agreements from the website checkout (run after 0008).
-- A customer reviews and signs one agreement per kind of product before they can pay. Each row is the full record:
-- the exact text they saw, who signed, how, when and from where. Written only by the Navigator server (service role)
-- and linked to the order by the Stripe webhook once payment succeeds. Staff can read; nobody else can.

create table public.signed_agreements (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  agreement_key     text not null,              -- which agreement, e.g. visa-services
  version           text not null,              -- version of the agreement text
  title             text not null,
  content_sha256    text not null,              -- fingerprint of the exact text shown
  cart_hash         text not null,              -- fingerprint of the items and prices it covers
  body              jsonb not null,             -- snapshot: sections and the order lines as the customer saw them
  skus              text[] not null,
  signer_name       text not null check (length(signer_name) between 2 and 200),
  signer_email      text not null check (length(signer_email) <= 320 and signer_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  signer_phone      text check (length(signer_phone) <= 60),
  signer_country    text check (length(signer_country) <= 80),
  signer_address    jsonb,
  signature_type    text not null check (signature_type in ('typed', 'drawn')),
  signature_font    text,
  signature_image   text check (length(signature_image) <= 200000),   -- PNG data URL of the signature
  consent_text      text not null,
  ip                text,
  user_agent        text check (length(user_agent) <= 500),
  order_id          uuid references public.orders (id) on delete set null,
  stripe_session_id text                         -- set by the webhook when the customer pays
);
create index signed_agreements_email_idx   on public.signed_agreements (signer_email, created_at desc);
create index signed_agreements_session_idx on public.signed_agreements (stripe_session_id);
create index signed_agreements_ip_idx      on public.signed_agreements (ip, created_at desc);

alter table public.signed_agreements enable row level security;

create policy signed_agreements_staff_read on public.signed_agreements for select to authenticated using (public.is_staff());

revoke all on public.signed_agreements from anon, authenticated;
grant select on public.signed_agreements to authenticated;
