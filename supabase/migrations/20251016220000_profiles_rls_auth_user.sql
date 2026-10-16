-- Allow reading/updating own profile when stable profile.id differs from auth.users.id
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = auth_user_id or auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = auth_user_id or auth.uid() = id);
