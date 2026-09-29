-- Profile photo. The image lives in the private client-docs bucket at {user_id}/avatar/{timestamp}.jpg,
-- covered by the existing own-folder and staff policies; the profile row stores its path.
alter table public.profiles add column if not exists avatar_path text;
grant insert (avatar_path), update (avatar_path) on public.profiles to authenticated;
