import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { DeploymentsFeed } from "./deployments-feed";

export default function DeploymentsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="GitHub / GitLab" title="Deployment & Commit Tracking" action="Connect repo" />
      <DeploymentsFeed />
    </AppShell>
  );
}
