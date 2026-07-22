Developer
    │
    │ git push feature/auth
    ▼
GitHub
    │
    ▼
CI Workflow Starts
    │
    ├── Workflow Run Created
    │
    ├── Build Job
    │
    ├── Test Job
    │
    └── Lint Job
    │
    ▼
Workflow Completed
    │
    ▼
Pull Request Approved
    │
    ▼
Merge into main
    │
    ▼
CD Workflow Starts
    │
    ├── Workflow Run Created
    │
    ├── Build Docker
    │
    ├── Push Docker
    │
    ├── Deploy
    │
    └── Health Check
    │
    ▼
Deployment Record Created
    │
    ▼
Application Running
    │
    ▼
OpenTelemetry
    │
    ├── Metrics
    ├── Logs
    └── Traces
    │
    ▼
Grafana Stack
    │
    ├── Loki (Logs)
    ├── Prometheus (Metrics)
    └── Tempo (Traces)
    │
    ▼
Monitoring Dashboard
    │
    ├── Workflow Runs
    ├── Deployments
    ├── Runtime Logs
    ├── Metrics
    └── Alerts


    webhook flow
    GitHub

        │

        ▼

POST /api/github/webhook

        │

Read Header

x-github-event

        │

Switch(event)

        │

 ┌──────────────┬──────────────┬──────────────┐
 │              │              │              │
 ▼              ▼              ▼              ▼
push      pull_request   workflow_run   workflow_job
 │              │              │              │
 ▼              ▼              ▼              ▼
update repo  update PR  workflow_runs  workflow_jobs
                                     │
                                     ▼
                               workflow_steps
                                     │
                                     ▼
                                 create logs