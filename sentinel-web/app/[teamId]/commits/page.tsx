import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { CommitsFeed } from "./commits-feed";

export default async function CommitsPage({ params }: { params: Promise<{ teamId: string }> }) {
  return (
    <AppShell params={params}>
      <PageHeader eyebrow="Source Control" title="Commit Tracking" action="New branch" />
      <CommitsFeed />
    </AppShell>
  );
}
