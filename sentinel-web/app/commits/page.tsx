import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { CommitsFeed } from "./commits-feed";

export default function CommitsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Source Control" title="Commit Tracking" action="New branch" />
      <CommitsFeed />
    </AppShell>
  );
}
