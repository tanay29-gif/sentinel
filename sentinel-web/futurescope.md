i can add the map to service as the result this wil decreas teh time complexit to the 0(n)  from the O(n^2)



Metrics	✅ OpenTelemetry → Grafana Cloud (Mimir)
Logs	✅ OpenTelemetry Logs → Grafana Cloud Loki
Health Monitoring	✅ /health endpoint + periodic checks stored in your database
Traces	✅ OpenTelemetry → Grafana Tempo (optional but recommended)
Incident Detection	Your own backend using metrics + logs + health
AI Summaries	LLM using metrics, logs, GitHub commits, deployments, and health data
Deployment Tracking	GitHub API (already implemented)
Dashboard	React + Next.js + Supabase

you can start using Triage and Monitoring without changing the schema.