-- Existing types preserved
create type public.incident_severity as enum ('SEV-1', 'SEV-2', 'SEV-3', 'SEV-4');
create type public.incident_status as enum ('Triage', 'Active', 'Monitoring', 'Resolved');
create type public.member_role as enum ('owner', 'incident_commander', 'responder', 'viewer');

-- New types for Git and SLA
create type public.git_provider as enum ('github', 'gitlab');
create type public.sla_status as enum ('Healthy', 'Warning', 'Breached');

-- Teams table (extended)
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null, -- For Next.js routing (e.g., /dashboard/my-team)
  github_installation_id text, -- For GitHub App integration
  slack_workspace_id text,
  created_at timestamptz not null default now()
);

-- Store communication channels (Slack/Discord) linked to specific incidents
create table public.incident_channels (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  provider text not null default 'slack',
  channel_id text not null, -- The Slack Channel ID
  channel_url text,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,
  health text not null default 'Healthy',
  uptime numeric(5,2) not null default 100,
  last_ping_at timestamptz,
  created_at timestamptz not null default now()
);

-- History table for health charts
create table public.service_health_history (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  status text not null, -- 'Up', 'Down', 'Degraded'
  latency_ms integer,
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  title text not null,
  severity public.incident_severity not null default 'SEV-3',
  status public.incident_status not null default 'Triage',
  
  -- AI Fields
  summary text not null default '', -- Manually edited summary
  ai_summary text, -- Raw AI generated summary
  ai_root_cause text, -- AI suggestion
  ai_metadata jsonb not null default '{}', -- Tokens used, model info, confidence
  
  commander_id uuid references auth.users(id) on delete set null,
  
  -- SLA tracking
  sla_due_at timestamptz,
  sla_status public.sla_status not null default 'Healthy',
  
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);


create table public.deployments (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  provider public.git_provider not null default 'github',
  repo_full_name text not null, -- e.g., "org/repo"
  commit_sha text not null,
  commit_message text,
  author_handle text,
  environment text not null, -- 'production', 'staging'
  status text not null, -- 'success', 'failure', 'in_progress'
  deployed_at timestamptz not null default now()
);

-- For deep log analysis (GitHub Actions logs)
create table public.logs (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  deployment_id uuid references public.deployments(id) on delete set null,
  run_id text, -- GitHub Action Run ID
  job_name text,
  level text not null, -- 'INFO', 'ERROR', 'WARN'
  message text not null,
  metadata jsonb not null default '{}', -- Stores the full log line or context
  created_at timestamptz not null default now()
);

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  user_id uuid references auth.users(id), -- Null if system generated
  event_type text not null, -- 'status_change', 'note_added', 'deployment_linked'
  content text not null,
  provenance jsonb not null default '{}', -- Source details (e.g., Slack, GitHub Webhook)
  created_at timestamptz not null default now()
);

-- Helper function to check team membership
create or replace function public.is_team_member(team_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.memberships
    where memberships.team_id = $1
    and memberships.user_id = auth.uid()
  );
$$ language sql security definer;

-- Apply to all major tables
alter table public.incidents enable row level security;
create policy "Team members can view incidents" on public.incidents
  for select using (is_team_member(team_id));

create policy "Team members can create incidents" on public.incidents
  for insert with check (is_team_member(team_id));

-- Similarly for logs, deployments, and services
alter table public.deployments enable row level security;
create policy "Team members can view deployments" on public.deployments
  for select using (is_team_member(team_id));

alter table public.logs enable row level security;
create policy "Team members can view logs" on public.logs
  for select using (is_team_member(team_id));

do $$
begin
  alter publication supabase_realtime add table public.deployments;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.logs;
exception
  when duplicate_object then null;
end $$;
