-- Existing types preserved
create type public.incident_severity as enum ('SEV-1', 'SEV-2', 'SEV-3', 'SEV-4');
create type public.incident_status as enum ('Triage', 'Active', 'Monitoring', 'Resolved');
create type public.member_role as enum ('owner', 'incident_commander', 'responder', 'viewer');

-- New types for Git and SLA
create type public.git_provider as enum ('github', 'gitlab');
create type public.sla_status as enum ('Healthy', 'Warning', 'Breached');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  github_installation_id text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Teams table (extended)
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null, -- For Next.js routing (e.g., /dashboard/my-team)
  github_installation_id text, -- For GitHub App integration
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique(team_id, user_id)
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

-- 1. Repositories Table (The Parent for all code)
create table public.repositories (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  name text not null,               -- e.g. "frontend-app"
  full_name text not null unique,    -- e.g. "my-org/frontend-app"
  provider text default 'github',
  html_url text,                    -- Link to GitHub repo
  default_branch text default 'main',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Branches Table (Linked to Repository)
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  name text not null,               -- e.g. "main", "feature/login"
  is_default boolean default false,
  created_at timestamptz not null default now(),
  unique(repository_id, name)
);

-- 3. Commits Table (Linked to Repository and Branch)
create table public.commits (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  sha text not null unique,
  message text not null,
  author_handle text,
  author_avatar_url text,
  committed_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 4. Update Deployments (Link to Repository ID instead of just text)
alter table public.deployments 
add column if not exists repository_id uuid references public.repositories(id) on delete cascade;


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
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.repositories enable row level security;
alter table public.branches enable row level security;
alter table public.commits enable row level security;
alter table public.deployments enable row level security;
alter table public.logs enable row level security;

create index if not exists idx_memberships_user_id on public.memberships(user_id);
create index if not exists idx_memberships_team_id on public.memberships(team_id);
create index if not exists idx_deployments_team_id on public.deployments(team_id);
create index if not exists idx_logs_team_id on public.logs(team_id);

create policy "Users can view their profile" on public.profiles
  for select using (id = auth.uid());

create policy "Users can create their profile" on public.profiles
  for insert with check (id = auth.uid());

create policy "Users can update their profile" on public.profiles
  for update using (id = auth.uid());

create policy "Users can view their memberships" on public.memberships
  for select using (user_id = auth.uid());

create policy "Users can create their owner membership" on public.memberships
  for insert with check (user_id = auth.uid() and role = 'owner');

create policy "Team members can view incidents" on public.incidents
  for select using (is_team_member(team_id));

create policy "Team members can create incidents" on public.incidents
  for insert with check (is_team_member(team_id));

create policy "Team members can view repositories" on public.repositories
  for select using (is_team_member(team_id));

create policy "Team members can create repositories" on public.repositories
  for insert with check (is_team_member(team_id));

create policy "Team members can update repositories" on public.repositories
  for update using (is_team_member(team_id));

create policy "Team members can view branches" on public.branches
  for select using (
    exists (
      select 1 from public.repositories
      where repositories.id = branches.repository_id
      and is_team_member(repositories.team_id)
    )
  );

create policy "Team members can create branches" on public.branches
  for insert with check (
    exists (
      select 1 from public.repositories
      where repositories.id = branches.repository_id
      and is_team_member(repositories.team_id)
    )
  );

create policy "Team members can update branches" on public.branches
  for update using (
    exists (
      select 1 from public.repositories
      where repositories.id = branches.repository_id
      and is_team_member(repositories.team_id)
    )
  );

create policy "Team members can view commits" on public.commits
  for select using (
    exists (
      select 1 from public.repositories
      where repositories.id = commits.repository_id
      and is_team_member(repositories.team_id)
    )
  );

create policy "Team members can create commits" on public.commits
  for insert with check (
    exists (
      select 1 from public.repositories
      where repositories.id = commits.repository_id
      and is_team_member(repositories.team_id)
    )
  );

create policy "Team members can update commits" on public.commits
  for update using (
    exists (
      select 1 from public.repositories
      where repositories.id = commits.repository_id
      and is_team_member(repositories.team_id)
    )
  );

create policy "Team members can create logs" on public.logs
  for insert with check (is_team_member(team_id));

create policy "Team members can view deployments" on public.deployments
  for select using (is_team_member(team_id));

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
