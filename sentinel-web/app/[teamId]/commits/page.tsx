import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { CommitsFeed } from "./commits-feed";



export default async function CommitsPage({ params }: { params: Promise<{ teamId: string }> }) {
   const { teamId  } = await params;

  return (
    <AppShell params={params}>
      <PageHeader eyebrow="Source control" title="Delivery pulse" action="Sync now" />
      <CommitsFeed teamId={teamId} />
    </AppShell>
  );
}
