-- Username-first auth: optional contact email, auth_email for Supabase login
alter table public.profiles
  add column if not exists username text,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists auth_email text;

update public.profiles
set
  username = coalesce(username, lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'))),
  auth_email = coalesce(auth_email, email)
where username is null or auth_email is null;

alter table public.profiles alter column email drop not null;

create unique index if not exists profiles_username_unique on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  u text := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  fn text := new.raw_user_meta_data->>'first_name';
  ln text := new.raw_user_meta_data->>'last_name';
  ph text := new.raw_user_meta_data->>'phone';
  ce text := nullif(trim(coalesce(new.raw_user_meta_data->>'contact_email', '')), '');
begin
  if u = '' then
    u := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  end if;
  insert into public.profiles (id, email, auth_email, username, first_name, last_name, phone, display_name)
  values (
    new.id,
    ce,
    new.email,
    u,
    fn,
    ln,
    ph,
    trim(coalesce(fn, '') || ' ' || coalesce(ln, ''))
  );
  return new;
end;
$$;
