-- Keep usage when login is removed: profile id stable, auth_user_id optional
alter table public.profiles
  add column if not exists auth_user_id uuid unique,
  add column if not exists login_removed boolean not null default false;

update public.profiles set auth_user_id = id where auth_user_id is null;

alter table public.profiles drop constraint if exists profiles_id_fkey;

alter table public.profiles
  add constraint profiles_auth_user_id_fkey
  foreign key (auth_user_id) references auth.users (id) on delete set null;

create index if not exists idx_profiles_auth_user on public.profiles (auth_user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid := gen_random_uuid();
  u text := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  fn text := new.raw_user_meta_data->>'first_name';
  ln text := new.raw_user_meta_data->>'last_name';
  ph text := new.raw_user_meta_data->>'phone';
  ce text := nullif(trim(coalesce(new.raw_user_meta_data->>'contact_email', '')), '');
begin
  if u = '' then
    u := lower(regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
  end if;
  insert into public.profiles (id, auth_user_id, email, auth_email, username, first_name, last_name, phone, display_name, login_removed)
  values (
    pid,
    new.id,
    ce,
    new.email,
    u,
    fn,
    ln,
    ph,
    trim(coalesce(fn, '') || ' ' || coalesce(ln, '')),
    false
  );
  return new;
end;
$$;

-- Dummy usage records (no login — login_removed)
insert into public.profiles (id, username, email, display_name, login_removed, is_admin, auth_email)
values
  ('a1000000-0000-4000-8000-000000000001', 'demo_alex', 'alex.demo@example.com', 'Alex Rivera', true, false, null),
  ('a1000000-0000-4000-8000-000000000002', 'demo_jordan', 'jordan.demo@example.com', 'Jordan Lee', true, false, null),
  ('a1000000-0000-4000-8000-000000000003', 'demo_removed', null, 'Former user (login removed)', true, false, null)
on conflict (id) do nothing;

insert into public.ai_runs (user_id, role_key, status, is_admin_run, cost_cents, output_text, completed_at)
select v.uid, 'job_seeker', 'completed', false, 99,
  '{"candidate":{"name":"Alex Rivera","headline":"Senior Frontend Engineer","topSkills":["React","TypeScript","Node"]},"role":{"title":"Staff Engineer","company":"Acme Corp"},"overallScore":82,"categoryScores":[{"label":"Skills match","score":88},{"label":"Experience","score":80},{"label":"Education & certs","score":70},{"label":"Culture & soft skills","score":78}],"summary":"Strong React/TS match; staff-level scope partially demonstrated.","skills":{"matched":["React","TypeScript"],"partial":["System design"],"missing":["Kubernetes"],"transferable":["Node.js"]},"strengths":["Modern frontend stack"],"gaps":["Limited platform ownership examples"],"recommendation":"hold — strong technical fit, probe leadership scope","interviewFocus":["Cross-team initiatives","Mentorship examples"]}',
  now() - interval '2 days'
from (values ('a1000000-0000-4000-8000-000000000001'::uuid)) as v(uid)
where not exists (select 1 from public.ai_runs r where r.user_id = v.uid limit 1);

insert into public.ai_runs (user_id, role_key, status, is_admin_run, cost_cents, output_text, completed_at)
select 'a1000000-0000-4000-8000-000000000002', 'recruiter', 'completed', false, 99,
  '{"candidate":{"name":"Jordan Lee","headline":"Product Manager","topSkills":["Roadmaps","SQL","B2B SaaS"]},"role":{"title":"Product Manager II","company":"Northwind"},"overallScore":74,"categoryScores":[{"label":"Skills match","score":76},{"label":"Experience","score":72},{"label":"Education & certs","score":68},{"label":"Culture & soft skills","score":80}],"summary":"Solid PM fundamentals; domain overlap moderate.","skills":{"matched":["SQL","Roadmaps"],"partial":["Enterprise sales cycle"],"missing":["AI product experience"],"transferable":["Analytics"]},"strengths":["Clear communication"],"gaps":["AI/ML product launches"],"recommendation":"advance — good culture signal","interviewFocus":["Prioritization under constraints"]}',
  now() - interval '1 day'
where not exists (select 1 from public.ai_runs where user_id = 'a1000000-0000-4000-8000-000000000002' limit 1);
