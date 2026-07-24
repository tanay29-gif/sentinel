## Table `teams`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `created_at` | `timestamptz` |  |
| `slug` | `text` |  Nullable Unique |
| `github_installation_id` | `text` |  Nullable Unique |
| `repository_name` | `text` |  Nullable |

## Table `memberships`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  |
| `user_id` | `uuid` |  |
| `role` | `member_role` |  |
| `created_at` | `timestamptz` |  |

## Table `services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  |
| `name` | `text` |  |
| `health` | `text` |  |
| `uptime` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `incidents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  |
| `service_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `severity` | `incident_severity` |  |
| `status` | `incident_status` |  |
| `summary` | `text` |  |
| `root_cause_suggestion` | `text` |  |
| `commander_id` | `uuid` |  Nullable |
| `sla_due_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `resolved_at` | `timestamptz` |  Nullable |
| `ai_summary` | `text` |  Nullable |
| `ai_metadata` | `jsonb` |  Nullable |

## Table `incident_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `incident_id` | `uuid` |  |
| `source` | `text` |  |
| `event` | `text` |  |
| `provenance` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `tasks`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `incident_id` | `uuid` |  Nullable |
| `title` | `text` |  |
| `assignee_id` | `uuid` |  Nullable |
| `priority` | `text` |  |
| `status` | `text` |  |
| `due_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  Nullable |
| `service_id` | `uuid` |  Nullable |
| `level` | `text` |  |
| `message` | `text` |  |
| `metadata` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `workflow_run_id` | `uuid` |  Nullable |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `full_name` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `github_installation_id` | `text` |  Nullable |
| `onboarding_completed` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `repositories`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `team_id` | `uuid` |  |
| `name` | `text` |  |
| `full_name` | `text` |  Unique |
| `provider` | `text` |  Nullable |
| `html_url` | `text` |  Nullable |
| `default_branch` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `repository_github_id` | `int8` |  Nullable |

## Table `branches`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `repository_id` | `uuid` |  |
| `name` | `text` |  |
| `is_default` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `commits`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `repository_id` | `uuid` |  |
| `sha` | `text` |  Unique |
| `message` | `text` |  |
| `author_name` | `text` |  Nullable |
| `committed_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `push_id` | `uuid` |  Nullable |
| `url` | `text` |  Nullable |

## Table `service_health`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `service_name` | `text` |  Unique |
| `request_count` | `int8` |  Nullable |
| `error_count` | `int8` |  Nullable |
| `response_time_ms` | `float8` |  Nullable |
| `memory_usage_mb` | `float8` |  Nullable |
| `cpu_usage_percent` | `float8` |  Nullable |
| `status` | `text` |  Nullable |
| `last_updated` | `timestamptz` |  Nullable |

## Table `workflow_runs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `github_run_id` | `int8` |  Unique |
| `team_id` | `uuid` |  |
| `repository_id` | `uuid` |  |
| `deployment_id` | `uuid` |  Nullable |
| `provider` | `text` |  Nullable |
| `workflow_name` | `text` |  Nullable |
| `event` | `text` |  Nullable |
| `branch` | `text` |  Nullable |
| `commit_sha` | `text` |  Nullable |
| `actor` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `conclusion` | `text` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `duration_ms` | `int8` |  Nullable |
| `html_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `workflow_jobs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_run_id` | `uuid` |  |
| `github_job_id` | `int8` |  Nullable Unique |
| `name` | `text` |  Nullable |
| `conclusion` | `text` |  Nullable |
| `runner_name` | `text` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `github_run_id` | `int8` |  Nullable |
| `runner_group_name` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `html_url` | `text` |  Nullable |

## Table `workflow_steps`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_job_id` | `uuid` |  |
| `step_name` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `step_number` | `int4` |  Nullable |
| `started_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |
| `conclusion` | `text` |  Nullable |

## Table `pull_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `repository_id` | `uuid` |  |
| `team_id` | `uuid` |  |
| `github_pr_id` | `int8` |  Unique |
| `number` | `int4` |  |
| `title` | `text` |  |
| `author` | `text` |  |
| `source_branch` | `text` |  |
| `target_branch` | `text` |  |
| `state` | `text` |  |
| `html_url` | `text` |  Nullable |
| `merged` | `bool` |  Nullable |
| `draft` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `merged_at` | `timestamptz` |  Nullable |
| `closed_at` | `timestamptz` |  Nullable |
| `inserted_at` | `timestamptz` |  Nullable |
| `last_event_message` | `text` |  Nullable |

## Table `workflow_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_run_id` | `uuid` |  Nullable |
| `repository_id` | `uuid` |  |
| `team_id` | `uuid` |  |
| `github_job_id` | `int8` |  Nullable |
| `event_type` | `text` |  |
| `level` | `text` |  Nullable |
| `title` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `workflow_job_id` | `int8` |  Nullable |

## Table `deployments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `github_deployment_id` | `int8` |  Unique |
| `github_run_id` | `int8` |  Nullable |
| `status` | `text` |  |
| `environment` | `text` |  |
| `commit_sha` | `text` |  |
| `environment_url` | `text` |  Nullable |
| `log_url` | `text` |  Nullable |
| `team_id` | `uuid` |  Nullable |
| `repository_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |
| `description` | `text` |  Nullable |

## Table `push_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `repository_id` | `uuid` |  |
| `team_id` | `uuid` |  |
| `branch` | `text` |  |
| `before_sha` | `text` |  |
| `after_sha` | `text` |  |
| `pusher` | `text` |  |
| `commit_count` | `int4` |  Nullable |
| `head_commit_message` | `text` |  Nullable |
| `compare_url` | `text` |  Nullable |
| `pushed_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `workflow_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `workflow_run_id` | `uuid` |  |
| `team_id` | `uuid` |  |
| `repository_id` | `uuid` |  |
| `source` | `text` |  Nullable |
| `storage_path` | `text` |  |
| `size` | `int8` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Custom Types / Enums

### `sla_status`

`Healthy` | `Warning` | `Breached`

### `incident_severity`

`SEV-1` | `SEV-2` | `SEV-3` | `SEV-4`

### `incident_status`

`Triage` | `Active` | `Monitoring` | `Resolved`

### `member_role`

`owner` | `incident_commander` | `responder` | `viewer`

### `git_provider`

`github` | `gitlab`

## RLS Policies

### `teams`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `members can read team data` | SELECT | public | PERMISSIVE | `(id IN ( SELECT m.team_id    FROM memberships m   WHERE (m.user_id = auth.uid())))` | — |

### `pull_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public read` | SELECT | public | PERMISSIVE | `true` | — |

### `logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Members can view logs` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM memberships m   WHERE ((m.team_id = logs.team_id) AND (m.user_id = auth.uid()))))` | — |

### `memberships`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `members can read memberships` | SELECT | public | PERMISSIVE | `(auth.uid() = user_id)` | — |

### `push_events`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `Allow public read` | SELECT | public | PERMISSIVE | `true` | — |

