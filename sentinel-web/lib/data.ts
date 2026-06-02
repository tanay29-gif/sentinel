import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock3,
  GitBranch,
  RadioTower,
  ShieldCheck,
  Siren,
} from "lucide-react";

export const currentUser = {
  name: "Tanay Sharma",
  email: "tanay@sentinel.dev",
  role: "Incident Commander",
  team: "Platform Reliability",
};

export const navItems = [
  { href: "/", label: "Command", icon: RadioTower },
  { href: "/incidents", label: "Incidents", icon: Siren },
  { href: "/logs", label: "Logs", icon: AlertTriangle },
  { href: "/deployments", label: "Deployments", icon: GitBranch },
  { href: "/services", label: "Services", icon: ShieldCheck },
  { href: "/tasks", label: "Tasks", icon: CheckCircle2 },
  { href: "/analytics", label: "Analytics", icon: Clock3 },
  { href: "/ai", label: "AI Copilot", icon: Bot },
];

export const incidents = [
  {
    id: "INC-1042",
    title: "Checkout API latency above SLO",
    severity: "SEV-1",
    status: "Active",
    service: "checkout-api",
    owner: "Asha",
    started: "14 min ago",
    sla: "31m left",
    summary:
      "P95 latency jumped after the 13:42 deploy. Error budget burn is 8.7x and payment retries are rising in ap-south-1.",
    rootCause:
      "Likely cache key regression in commit 4f9c2a1 causing repeated inventory lookups.",
  },
  {
    id: "INC-1039",
    title: "Worker queue saturation",
    severity: "SEV-2",
    status: "Triage",
    service: "billing-worker",
    owner: "Rohan",
    started: "48 min ago",
    sla: "1h 12m left",
    summary:
      "Retry queue depth crossed 120k after partner webhook timeouts increased.",
    rootCause:
      "External provider response timeouts are holding worker slots open.",
  },
  {
    id: "INC-1032",
    title: "Search cluster memory pressure",
    severity: "SEV-3",
    status: "Monitoring",
    service: "search",
    owner: "Meera",
    started: "2h ago",
    sla: "Met",
    summary:
      "Heap pressure stabilized after shard relocation and index throttling.",
    rootCause: "Index compaction overlapped with campaign traffic spike.",
  },
];

export const services = [
  { name: "checkout-api", uptime: "99.92%", health: "Degraded", latency: 842, errorRate: "4.8%" },
  { name: "payments", uptime: "99.99%", health: "Healthy", latency: 121, errorRate: "0.2%" },
  { name: "billing-worker", uptime: "99.81%", health: "At risk", latency: 430, errorRate: "2.1%" },
  { name: "search", uptime: "99.95%", health: "Healthy", latency: 206, errorRate: "0.6%" },
  { name: "identity", uptime: "100%", health: "Healthy", latency: 88, errorRate: "0.0%" },
];

export const deployments = [
  { id: "DEP-884", repo: "sentinel/checkout-api", commit: "4f9c2a1", env: "prod", status: "Suspect", author: "Asha", time: "18m ago" },
  { id: "DEP-883", repo: "sentinel/web", commit: "8bc44ef", env: "prod", status: "Passed", author: "Ishan", time: "1h ago" },
  { id: "DEP-882", repo: "sentinel/billing-worker", commit: "1d9ab30", env: "staging", status: "Running", author: "Rohan", time: "2h ago" },
  { id: "DEP-881", repo: "sentinel/search", commit: "7a41dd2", env: "prod", status: "Rolled back", author: "Meera", time: "Yesterday" },
];

export const logs = [
  { level: "ERROR", service: "checkout-api", message: "Inventory hydrate timeout after 3000ms", time: "13:58:22", trace: "trc_09f3" },
  { level: "WARN", service: "checkout-api", message: "Cache miss ratio exceeded 70% for product_detail", time: "13:57:51", trace: "trc_09e8" },
  { level: "ERROR", service: "billing-worker", message: "Webhook provider returned 504 gateway timeout", time: "13:55:12", trace: "trc_08aa" },
  { level: "INFO", service: "payments", message: "Circuit breaker half-open probe succeeded", time: "13:53:03", trace: "trc_073d" },
  { level: "WARN", service: "search", message: "Shard relocation throttled by disk watermark", time: "13:47:49", trace: "trc_06c1" },
];

export const tasks = [
  { title: "Roll back checkout-api DEP-884", assignee: "Asha", priority: "P0", due: "9 min", status: "In progress" },
  { title: "Compare latency by cache key", assignee: "Tanay", priority: "P0", due: "18 min", status: "Open" },
  { title: "Notify support about degraded checkout", assignee: "Nia", priority: "P1", due: "25 min", status: "Open" },
  { title: "Draft customer impact notes", assignee: "Vikram", priority: "P2", due: "Today", status: "Queued" },
];

export const timeline = [
  { time: "13:42", source: "GitHub", event: "DEP-884 shipped commit 4f9c2a1 to production." },
  { time: "13:46", source: "Grafana", event: "P95 latency crossed 700ms for checkout-api." },
  { time: "13:48", source: "Sentinel AI", event: "Incident created and classified as SEV-1." },
  { time: "13:52", source: "Logs", event: "Cache miss warnings correlated with inventory timeouts." },
  { time: "13:56", source: "Slack", event: "Asha accepted incident commander handoff." },
];

export const analytics = [
  { label: "Mon", incidents: 3, deploys: 14, stability: 97 },
  { label: "Tue", incidents: 4, deploys: 16, stability: 95 },
  { label: "Wed", incidents: 2, deploys: 19, stability: 98 },
  { label: "Thu", incidents: 6, deploys: 17, stability: 91 },
  { label: "Fri", incidents: 1, deploys: 12, stability: 99 },
];
