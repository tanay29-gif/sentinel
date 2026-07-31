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

                    GitHub Webhooks
                   /                \
          workflow_run          deployment_status
                 |                      |
                 |                      |
                 +----------+-----------+
                            |
                            v
                  Create Incident Immediately
                            |
                            v
                        Supabase
                            ^
                            |
      ---------------------------------------------
      |                                           |
Health Scheduler                         Grafana Scheduler
(every 1 min)                            (every 1 min)
      |                                           |
      +-------------------+-----------------------+
                          |
                   Check all services
                          |
                   Create/Update Incident
                          |
                       Supabase
                          |
                    Realtime Updates
                          |
                    Incident Dashboard



Health
    ↓
Service Unavailable (SEV-1)

Grafana
    ↓
Error Rate > 20%
    ↓
High Error Rate (SEV-1)

Grafana
    ↓
Latency > 2000 ms
    ↓
High Latency (SEV-2)

Deployment Status
    ↓
Failure
    ↓
Deployment Failed (SEV-2)

Workflow Run
    ↓
Failure
    ↓
Workflow Failed (SEV-3)

Trigger	Severity
Health endpoint down	SEV-1
Error rate > 30%	SEV-1
Error rate 10–30%	SEV-2
Latency > 2 s for several minutes	SEV-2
deployment_status = failure	SEV-2
workflow_run failed	SEV-3
workflow_job failed	SEV-3
Push / PR	No incident


High Latency

source
-------
grafana

source_reference
----------------
service123:latency