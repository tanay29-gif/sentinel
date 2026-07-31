import { Users, ShieldCheck, Eye, UserCog } from "lucide-react";

import { MetricCard } from "@/components/sentinel/metric-card";
import { AppShell} from "@/components/sentinel/app-shell";
import {PageHeader } from "@/components//sentinel/page-header";
import TeamMembers from "./TeamMembers";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;

  return (
    <AppShell teamId={teamId}>
      <PageHeader
        eyebrow="Team"
        title="Team Settings"
        action="Manage Members"
      />

      <div className="space-y-6">

        <TeamMembers teamId={teamId} />
      </div>
    </AppShell>
  );
}