create type public.incident_severity as enum ('SEV-1', 'SEV-2', 'SEV-3', 'SEV-4');
create type public.incident_status as enum ('Triage', 'Active', 'Monitoring', 'Resolved');
create type public.member_role as enum ('owner', 'incident_commander', 'responder', 'viewer');

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'responder',
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  health text not null default 'Healthy',
  uptime numeric(5,2) not null default 100,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  title text not null,
  severity public.incident_severity not null default 'SEV-3',
  status public.incident_status not null default 'Triage',
  summary text not null default '',
  root_cause_suggestion text not null default '',
  commander_id uuid references auth.users(id) on delete set null,
  sla_due_at timestamptz,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  source text not null,
  event text not null,
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade,
  title text not null,
  assignee_id uuid references auth.users(id) on delete set null,
  priority text not null default 'P2',
  status text not null default 'Open',
  due_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  provider text not null default 'github',
  repo text not null,
  commit_sha text not null,
  environment text not null,
  status text not null,
  deployed_at timestamptz not null default now()
);

create table public.logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  level text not null,
  message text not null,
  trace_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.teams enable row level security;
alter table public.memberships enable row level security;
alter table public.services enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_events enable row level security;
alter table public.tasks enable row level security;
alter table public.deployments enable row level security;
alter table public.logs enable row level security;

create policy "members can read team data" on public.teams
for select using (exists (select 1 from public.memberships m where m.team_id = id and m.user_id = auth.uid()));

create policy "members can read memberships" on public.memberships
for select using (user_id = auth.uid() or exists (select 1 from public.memberships m where m.team_id = team_id and m.user_id = auth.uid()));
