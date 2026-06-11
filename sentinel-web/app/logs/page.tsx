import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { LogStream } from "./log-stream";

export default function LogsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Observability" title="Centralized Logs & Alerts" action="Add alert rule" />
      <LogStream />
    </AppShell>
  );
}
