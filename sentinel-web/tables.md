-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.teams (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  slug text UNIQUE,
  github_installation_id text UNIQUE,
  repository_name text,
  CONSTRAINT teams_pkey PRIMARY KEY (id)
);
CREATE TABLE public.memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL DEFAULT 'responder'::member_role,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT memberships_pkey PRIMARY KEY (id),
  CONSTRAINT memberships_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  name text NOT NULL UNIQUE,
  health text NOT NULL DEFAULT 'Healthy'::text,
  uptime numeric NOT NULL DEFAULT 100,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  base_url text,
  CONSTRAINT services_pkey PRIMARY KEY (id),
  CONSTRAINT services_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  service_id uuid,
  title text NOT NULL,
  severity USER-DEFINED NOT NULL DEFAULT 'SEV-3'::incident_severity,
  status USER-DEFINED NOT NULL DEFAULT 'Triage'::incident_status,
  summary text NOT NULL DEFAULT ''::text,
  root_cause_suggestion text NOT NULL DEFAULT ''::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  resolved_at timestamp with time zone,
  ai_summary text,
  ai_metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT incidents_pkey PRIMARY KEY (id),
  CONSTRAINT incidents_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT incidents_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id)
);
CREATE TABLE public.incident_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL,
  source text NOT NULL,
  event text NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT incident_events_pkey PRIMARY KEY (id),
  CONSTRAINT incident_events_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  incident_id uuid,
  title text NOT NULL,
  assignee_id uuid,
  priority text NOT NULL DEFAULT 'P2'::text,
  status text NOT NULL DEFAULT 'Open'::text,
  due_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_incident_id_fkey FOREIGN KEY (incident_id) REFERENCES public.incidents(id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES auth.users(id)
);
CREATE TABLE public.logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid,
  service_id uuid,
  level text NOT NULL,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  workflow_run_id uuid,
  CONSTRAINT logs_pkey PRIMARY KEY (id),
  CONSTRAINT logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT logs_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id),
  CONSTRAINT logs_workflow_run_id_fkey FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now(),
  github_installation_id text,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone,
  email text UNIQUE,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.repositories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL,
  name text NOT NULL,
  full_name text NOT NULL UNIQUE,
  provider text DEFAULT 'github'::text,
  html_url text,
  default_branch text DEFAULT 'main'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  repository_github_id bigint,
  CONSTRAINT repositories_pkey PRIMARY KEY (id),
  CONSTRAINT repositories_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL,
  name text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT branches_pkey PRIMARY KEY (id),
  CONSTRAINT branches_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id)
);
CREATE TABLE public.commits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL,
  sha text NOT NULL UNIQUE,
  message text NOT NULL,
  author_name text,
  committed_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  push_id uuid,
  url text,
  CONSTRAINT commits_pkey PRIMARY KEY (id),
  CONSTRAINT commits_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id),
  CONSTRAINT commits_push_id_fkey FOREIGN KEY (push_id) REFERENCES public.push_events(id)
);
CREATE TABLE public.service_health (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  service_name text NOT NULL UNIQUE,
  request_count bigint DEFAULT 0,
  error_count bigint DEFAULT 0,
  response_time_ms double precision DEFAULT 0,
  memory_usage_mb double precision DEFAULT 0,
  cpu_usage_percent double precision DEFAULT 0,
  status text DEFAULT 'healthy'::text,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT service_health_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workflow_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  github_run_id bigint NOT NULL UNIQUE,
  team_id uuid NOT NULL,
  repository_id uuid NOT NULL,
  deployment_id uuid,
  provider text,
  workflow_name text,
  event text,
  branch text,
  commit_sha text,
  actor text,
  status text,
  conclusion text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  duration_ms bigint,
  html_url text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workflow_runs_pkey PRIMARY KEY (id),
  CONSTRAINT fk_workflow_runs_repository FOREIGN KEY (repository_id) REFERENCES public.repositories(id),
  CONSTRAINT fk_workflow_runs_team FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.workflow_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL,
  github_job_id bigint UNIQUE,
  name text,
  conclusion text,
  runner_name text,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  github_run_id bigint,
  runner_group_name text,
  status text,
  html_url text,
  CONSTRAINT workflow_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT workflow_jobs_workflow_run_id_fkey FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs(id)
);
CREATE TABLE public.workflow_steps (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_job_id uuid NOT NULL,
  step_name text,
  status text,
  step_number integer,
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  conclusion text,
  CONSTRAINT workflow_steps_pkey PRIMARY KEY (id),
  CONSTRAINT workflow_steps_workflow_job_id_fkey FOREIGN KEY (workflow_job_id) REFERENCES public.workflow_jobs(id)
);
CREATE TABLE public.pull_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL,
  team_id uuid NOT NULL,
  github_pr_id bigint NOT NULL UNIQUE,
  number integer NOT NULL,
  title text NOT NULL,
  author text NOT NULL,
  source_branch text NOT NULL,
  target_branch text NOT NULL,
  state text NOT NULL,
  html_url text,
  merged boolean DEFAULT false,
  draft boolean DEFAULT false,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  merged_at timestamp with time zone,
  closed_at timestamp with time zone,
  inserted_at timestamp with time zone DEFAULT now(),
  last_event_message text,
  CONSTRAINT pull_requests_pkey PRIMARY KEY (id),
  CONSTRAINT pull_requests_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id),
  CONSTRAINT pull_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.workflow_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_run_id uuid,
  repository_id uuid NOT NULL,
  team_id uuid NOT NULL,
  github_job_id bigint,
  event_type text NOT NULL,
  level text,
  title text,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  workflow_job_id bigint,
  status text,
  CONSTRAINT workflow_events_pkey PRIMARY KEY (id),
  CONSTRAINT workflow_events_workflow_run_id_fkey FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs(id),
  CONSTRAINT workflow_events_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id),
  CONSTRAINT workflow_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.deployments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  github_deployment_id bigint NOT NULL UNIQUE,
  github_run_id bigint,
  status text NOT NULL,
  environment text NOT NULL,
  commit_sha text NOT NULL,
  environment_url text,
  log_url text,
  team_id uuid,
  repository_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  description text,
  repository_full_name text,
  workflow_run_id uuid,
  CONSTRAINT deployments_pkey PRIMARY KEY (id),
  CONSTRAINT deployments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT deployments_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id),
  CONSTRAINT deployments_workflow_run_id_fkey FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs(id)
);
CREATE TABLE public.push_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL,
  team_id uuid NOT NULL,
  branch text NOT NULL,
  before_sha text NOT NULL,
  after_sha text NOT NULL,
  pusher text NOT NULL,
  commit_count integer DEFAULT 0,
  head_commit_message text,
  compare_url text,
  pushed_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_events_pkey PRIMARY KEY (id),
  CONSTRAINT push_events_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id),
  CONSTRAINT push_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id)
);
CREATE TABLE public.workflow_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workflow_run_id uuid NOT NULL,
  team_id uuid NOT NULL,
  repository_id uuid NOT NULL,
  source text DEFAULT 'github'::text,
  storage_path text NOT NULL,
  size bigint,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workflow_logs_pkey PRIMARY KEY (id),
  CONSTRAINT workflow_logs_workflow_run_id_fkey FOREIGN KEY (workflow_run_id) REFERENCES public.workflow_runs(id),
  CONSTRAINT workflow_logs_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id),
  CONSTRAINT workflow_logs_repository_id_fkey FOREIGN KEY (repository_id) REFERENCES public.repositories(id)
);