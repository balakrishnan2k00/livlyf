-- Livlyf core schema
create extension if not exists "pgcrypto";

create type public.usage_status as enum ('pending_payment', 'paid', 'running', 'completed', 'failed', 'refunded');
create type public.prompt_scope as enum ('system', 'user');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  headline text,
  summary text,
  skills jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  links jsonb not null default '{}'::jsonb,
  is_admin boolean not null default false,
  stripe_customer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  company text,
  location text,
  raw_text text not null,
  parsed jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.role_definitions (
  key text primary key,
  label text not null,
  description text,
  icon text,
  sort_order int not null default 0
);

create table public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  role_key text not null references public.role_definitions (key) on delete cascade,
  name text not null,
  system_prompt text not null,
  user_prompt_template text not null,
  is_default boolean not null default false,
  variables jsonb not null default '["profile","jd","goal"]'::jsonb,
  created_at timestamptz not null default now()
);

create table public.user_prompts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_key text not null references public.role_definitions (key) on delete cascade,
  name text not null default 'Custom',
  system_prompt text not null,
  user_prompt_template text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, role_key, name)
);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_key text not null references public.role_definitions (key),
  prompt_template_id uuid references public.prompt_templates (id),
  user_prompt_id uuid references public.user_prompts (id),
  profile_id uuid references public.profiles (id),
  job_description_id uuid references public.job_descriptions (id),
  status public.usage_status not null default 'pending_payment',
  is_admin_run boolean not null default false,
  input_snapshot jsonb not null default '{}'::jsonb,
  output_text text,
  model text,
  tokens_in int,
  tokens_out int,
  cost_cents int not null default 0,
  stripe_payment_intent_id text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_jd_user on public.job_descriptions (user_id);
create index idx_runs_user on public.ai_runs (user_id, created_at desc);
create index idx_user_prompts_user on public.user_prompts (user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger jd_updated before update on public.job_descriptions
  for each row execute function public.set_updated_at();
create trigger user_prompts_updated before update on public.user_prompts
  for each row execute function public.set_updated_at();

-- profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.job_descriptions enable row level security;
alter table public.role_definitions enable row level security;
alter table public.prompt_templates enable row level security;
alter table public.user_prompts enable row level security;
alter table public.ai_runs enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

create policy "jd_all_own" on public.job_descriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "roles_read" on public.role_definitions for select to authenticated using (true);
create policy "templates_read" on public.prompt_templates for select to authenticated using (true);

create policy "user_prompts_own" on public.user_prompts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "runs_select_own" on public.ai_runs for select using (auth.uid() = user_id);
create policy "runs_insert_own" on public.ai_runs for insert with check (auth.uid() = user_id);

-- Seed roles
insert into public.role_definitions (key, label, description, icon, sort_order) values
  ('job_seeker', 'Job seeker', 'Tailor applications and spot gaps', 'briefcase', 1),
  ('recruiter', 'Recruiter', 'Screen candidates against reqs', 'users', 2),
  ('hr_manager', 'HR manager', 'Policy, leveling, and fairness', 'shield', 3),
  ('career_coach', 'Career coach', 'Narrative and trajectory planning', 'compass', 4),
  ('interview_prep', 'Interview prep', 'STAR answers and mock questions', 'mic', 5),
  ('resume_writer', 'Resume writer', 'Dense, ATS-friendly bullets', 'file-text', 6),
  ('hiring_manager', 'Hiring manager', 'Scorecards and team fit', 'target', 7),
  ('founder', 'Founder / exec', 'Pitch, vision, and leadership story', 'sparkles', 8);

-- Default prompts (dynamic placeholders: {{profile}}, {{jd}}, {{goal}}, {{role}})
insert into public.prompt_templates (role_key, name, is_default, system_prompt, user_prompt_template) values
('job_seeker', 'Fit & gaps', true,
 'You are Livlyf, a precise career analyst. Use only the profile and JD provided. Be concise, actionable, and honest. Output markdown with sections: Fit score (0-100), Top matches, Gaps, 3 tailored bullets for resume, Outreach hook.',
 'Role: Job seeker\nGoal: {{goal}}\n\n## Profile\n{{profile}}\n\n## Job description\n{{jd}}'),
('recruiter', 'Screening brief', true,
 'You are Livlyf recruiting intelligence. No bias by protected classes. Score evidence from profile vs JD. Markdown: Recommendation (advance/hold/pass), Evidence table, Risks, Phone-screen questions (5).',
 'Role: Recruiter\nGoal: {{goal}}\n\n## Candidate profile\n{{profile}}\n\n## Job description\n{{jd}}'),
('hr_manager', 'Leveling & compliance', true,
 'You are Livlyf HR advisor. Flag compliance-sensitive wording; suggest inclusive alternatives. Markdown: Level estimate, Comp band considerations (no exact numbers unless in JD), Policy notes, Interview panel mix.',
 'Role: HR manager\nGoal: {{goal}}\n\n## Profile\n{{profile}}\n\n## Job description\n{{jd}}'),
('career_coach', 'Trajectory plan', true,
 'You are Livlyf career coach. Empowering, realistic. Markdown: North-star role, 90-day plan, Skills to build, Network moves, One accountability metric.',
 'Role: Career coach\nGoal: {{goal}}\n\n## Profile\n{{profile}}\n\n## Target context (JD optional)\n{{jd}}'),
('interview_prep', 'Mock interview', true,
 'You are Livlyf interview coach. Generate tough but fair questions from the JD. Then model strong STAR answers using only profile facts (label assumptions). Markdown: 8 questions, 3 deep STAR drafts, Red flags to avoid.',
 'Role: Interview prep\nGoal: {{goal}}\n\n## Profile\n{{profile}}\n\n## Job description\n{{jd}}'),
('resume_writer', 'Resume pass', true,
 'You are Livlyf resume editor. ATS-safe, metric-led bullets. Markdown: Headline options (3), Summary (80 words max), Experience bullets (rewrite), Skills line, Keywords from JD.',
 'Role: Resume writer\nGoal: {{goal}}\n\n## Profile\n{{profile}}\n\n## Job description\n{{jd}}'),
('hiring_manager', 'Scorecard', true,
 'You are Livlyf hiring partner. Markdown: Must-haves check, Nice-to-haves, Scorecard (criteria 1-5), Team fit notes, Final recommendation.',
 'Role: Hiring manager\nGoal: {{goal}}\n\n## Candidate profile\n{{profile}}\n\n## Job description\n{{jd}}'),
('founder', 'Leadership narrative', true,
 'You are Livlyf executive storyteller. Markdown: 30-second pitch, Vision tie-in, Proof points, Board/investor FAQ (3), Hiring brand line.',
 'Role: Founder / exec\nGoal: {{goal}}\n\n## Profile\n{{profile}}\n\n## Context\n{{jd}}');
