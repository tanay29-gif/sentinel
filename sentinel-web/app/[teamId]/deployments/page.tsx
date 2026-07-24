import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { DeploymentsFeed } from "./deployments-feed";

export default async function DeploymentsPage({ params }: { params: Promise<{ teamId: string }> }) {
  return (
    <AppShell params ={params}>
      <PageHeader eyebrow="GitHub / GitLab" title="CI/CD Pipeline" action="View runs" />
      <DeploymentsFeed />
    </AppShell>
  );
}
