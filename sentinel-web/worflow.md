Developer
    │
    │ git push feature/login
    ▼
Feature Branch
    │
    ▼
Open Pull Request
    │
    ▼
GitHub Actions (CI)
    │
    ├── Checkout Code
    ├── Install Dependencies
    ├── Run Linter
    ├── Run Unit Tests
    ├── Run Build
    └── CI Passes ✅
    │
    ▼
Reviewer Approves
    │
    ▼
Merge into main
    │
    ▼
GitHub Actions (CD)
    │
    ├── Checkout main
    ├── Build Production
    ├── Build Docker Image
    ├── Push Docker Image
    ├── Deploy to Server/Kubernetes/Vercel
    └── Health Check
    │
    ▼
Application Running
    │
    ▼
Grafana / Prometheus / Loki
    │
    ▼
Logs • Metrics • Alerts