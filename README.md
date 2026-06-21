🛡️ SENTINEL

The AI-Native Incident Command Center.

SENTINEL unifies your fragmented DevOps toolchain into a single workspace. It
connects your logs, deployments, and team communications with an AI layer that
helps you resolve production issues in minutes, not hours.

Live Demo | Documentation

⚡ The Problem

Modern teams waste 30% of their time jumping between Slack, Grafana, GitHub, and
Jira. When production goes down, context is lost in the noise.

✨ Key Features

  - Unified Incident Hub: Real-time triage with severity classification.
  - AI Diagnostics: Instant incident summaries and root-cause suggestions.
  - Deployment Sync: GitHub/GitLab integration to track commits vs. failures.
  - Service Health: Uptime monitoring and SLA-aware workflows.
  - Timeline Provenance: Auto-generated event logs for every incident.
  - Role-Based Security: Secure team access via RBAC.

🛠️ The Light Stack

  - Frontend: Next.js 14 (App Router) + Tailwind CSS + Shadcn UI.
  - Backend/BaaS: Supabase (Auth, Database, Edge Functions).
  - AI Engine: OpenAI / Anthropic API (for log analysis).
  - Monitoring: OpenTelemetry / Custom Webhooks.
  - Deployment: Vercel.

🚀 Quick Start

1.  Clone & Install

    git clone https://github.com/your-username/sentinel.git
    cd sentinel
    npm install

2.  Supabase Setup

      - Create a new project at database.new.
      - Run the provided schema.sql in the Supabase SQL Editor.
      - Enable Realtime on the incidents table.

3.  Environment Variables Create a .env.local:

    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    OPENAI_API_KEY=your-key

4.  Launch

    npm run dev

🧠 AI Capabilities

  - Log Intelligence: Ask SENTINEL "Why did the API spike?" and get a
    plain-English explanation.
  - Auto-Postmortems: Generate a complete incident report in Markdown with one
    click.
  - Smart Escalation: Automatically pings the right engineer based on the commit
    history of the failing service.

📈 Roadmap

- [x] Supabase Auth & DB Integration
- [x] Real-time Incident Dashboard
- [ ] Conversational Log Querying (NLP)
- [ ] Voice-to-Ticket Incident Creation
- [ ] Slack/Discord Integration

SENTINEL — Less firefighting, more building.
