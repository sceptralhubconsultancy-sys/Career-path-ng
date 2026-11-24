-- PathShift Career Transition Assessment App
-- Migration 001: Initial Schema, Indexes, Triggers, and Row Level Security (RLS)

-- 1. Tables
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  first_name text not null,
  email text not null unique,
  age int check (age >= 18 and age <= 80),
  country text,
  consent boolean not null default false,
  track text check (track in ('digital', 'physical', 'both')),
  physical_industry text,
  current_title text,
  years_in_role text,
  current_industry text,
  fulfilment int check (fulfilment >= 1 and fulfilment <= 10),
  drains text[],
  strengths text[],
  past_loves text,
  skills_education text,
  min_income text,
  hours_per_week text,
  biggest_fear text,
  status text not null default 'started'
    check (status in ('started', 'completed', 'viewed_offer', 'whatsapp_clicked', 'declined', 'paid')),
  chosen_path text,
  refine_rounds int not null default 0,
  utm_source text
);

create table if not exists public.recommendations (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  round int not null default 0,
  summary text,
  options jsonb not null,
  ratings jsonb,
  model_used text,
  created_at timestamptz not null default now()
);

create table if not exists public.refinement_answers (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  round int not null,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  event text not null,
  meta jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Indexes
create index if not exists idx_leads_email on public.leads (email);
create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_created_at_desc on public.leads (created_at desc);
create index if not exists idx_recommendations_lead_id on public.recommendations (lead_id);
create index if not exists idx_refinement_answers_lead_id on public.refinement_answers (lead_id);
create index if not exists idx_events_lead_id on public.events (lead_id);

-- 3. Automatic updated_at trigger on leads
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row
execute function public.set_updated_at();

-- 4. Helper function to check admin membership
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

-- 5. Row Level Security (RLS enabled on EVERY table)
alter table public.leads enable row level security;
alter table public.recommendations enable row level security;
alter table public.refinement_answers enable row level security;
alter table public.events enable row level security;
alter table public.rate_limits enable row level security;
alter table public.admin_users enable row level security;

-- Anonymous users get NO direct SELECT/UPDATE/DELETE on any table.
-- All assessment reads and writes go through Edge Functions using the service role key.

-- Admin policies: SELECT and UPDATE on all operational tables
drop policy if exists "Admins can select leads" on public.leads;
create policy "Admins can select leads"
  on public.leads for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update leads" on public.leads;
create policy "Admins can update leads"
  on public.leads for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can select recommendations" on public.recommendations;
create policy "Admins can select recommendations"
  on public.recommendations for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update recommendations" on public.recommendations;
create policy "Admins can update recommendations"
  on public.recommendations for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can select refinement_answers" on public.refinement_answers;
create policy "Admins can select refinement_answers"
  on public.refinement_answers for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update refinement_answers" on public.refinement_answers;
create policy "Admins can update refinement_answers"
  on public.refinement_answers for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can select events" on public.events;
create policy "Admins can select events"
  on public.events for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can update events" on public.events;
create policy "Admins can update events"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can select rate_limits" on public.rate_limits;
create policy "Admins can select rate_limits"
  on public.rate_limits for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can select own admin_users row" on public.admin_users;
create policy "Admins can select own admin_users row"
  on public.admin_users for select
  to authenticated
  using (user_id = auth.uid());

-- 6. Explicit role grants (RLS remains enforced for authenticated; anon has no access)
grant usage on schema public to service_role, authenticated;
revoke all on all tables in schema public from anon;

grant all privileges on table
  public.leads,
  public.recommendations,
  public.refinement_answers,
  public.events,
  public.rate_limits,
  public.admin_users
to service_role;

grant select, update on table
  public.leads,
  public.recommendations,
  public.refinement_answers,
  public.events
to authenticated;

grant select on table
  public.rate_limits,
  public.admin_users
to authenticated;

