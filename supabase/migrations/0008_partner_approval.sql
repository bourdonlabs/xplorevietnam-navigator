-- XploreVietnam: partner applications are reviewed by staff before they go live (run after 0007).
-- New sign-ups start as 'pending': no working coupon code, no tracked clicks, no commission, until staff approve.
-- Statuses: pending (waiting for review), active (approved), suspended (paused by staff), rejected (not approved).
-- Existing partners keep their current status. register_partner() does not set a status, so it picks up the new default.

alter table public.partners drop constraint partners_status_check;
alter table public.partners add constraint partners_status_check
  check (status in ('pending', 'active', 'suspended', 'rejected'));
alter table public.partners alter column status set default 'pending';
