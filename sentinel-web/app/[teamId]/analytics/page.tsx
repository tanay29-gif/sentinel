import { Activity, AlertTriangle, GitBranch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { MetricCard } from "@/components/sentinel/metric-card";
import { PageHeader } from "@/components/sentinel/page-header";
import { analytics } from "@/lib/data";

export default async function AnalyticsPage({ params }: { params: Promise<{ teamId: string }> }) {
  return (
    <AppShell params={params}>
      <PageHeader eyebrow="Reliability trends" title="Deployment Stability & Incident Analytics" action="Export report" />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Incidents this week" value="16" detail="22% lower than last week" icon={AlertTriangle} tone="amber" />
        <MetricCard title="Deploys tracked" value="78" detail="4 rollback events detected" icon={GitBranch} tone="slate" />
        <MetricCard title="MTTR" value="38m" detail="SEV-1 target is 45m" icon={Activity} tone="emerald" />
      </section>
      <Card className="mt-4 rounded-md">
        <CardHeader><CardTitle>Weekly Stability</CardTitle></CardHeader>
        <CardContent>
          <div className="grid h-72 grid-cols-5 items-end gap-4">
            {analytics.map((day) => (
              <div key={day.label} className="flex h-full flex-col justify-end gap-2">
                <div className="rounded-t-md bg-emerald-600" style={{ height: `${day.stability}%` }} />
                <div className="text-center text-sm">
                  <p className="font-medium">{day.label}</p>
                  <p className="text-xs text-slate-500">{day.incidents} inc / {day.deploys} dep</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
