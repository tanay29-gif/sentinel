import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { LogStream } from "./log-stream";

export default async function LogsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  return (
<AppShell teamId={teamId}>
      <PageHeader eyebrow="Observability" title="Centralized Logs & Alerts" action="Add alert rule" />
      <LogStream />
    </AppShell>
  );
}
