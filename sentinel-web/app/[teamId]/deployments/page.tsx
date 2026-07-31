import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { DeploymentsFeed } from "./deployments-feed";

export default async function DeploymentsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const resolvedParams = await params;
  const teamId = resolvedParams.teamId;

  return (
    <AppShell teamId ={teamId}>
      <PageHeader eyebrow="GitHub / GitLab" title="CI/CD Pipeline" action="View runs" />
      <DeploymentsFeed />
    </AppShell>
  );
}
