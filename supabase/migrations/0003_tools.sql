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
