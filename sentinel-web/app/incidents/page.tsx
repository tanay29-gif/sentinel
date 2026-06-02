import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { incidents } from "@/lib/data";

export default function IncidentsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Triage queue" title="Incidents" action="New incident" />
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Real-time Incident Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incidents.map((incident) => (
            <div key={incident.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={incident.severity === "SEV-1" ? "destructive" : "secondary"}>{incident.severity}</Badge>
                  <Badge variant="outline">{incident.status}</Badge>
                  <span className="text-sm font-mono text-slate-500">{incident.id}</span>
                </div>
                <span className="text-sm text-slate-500">SLA: {incident.sla}</span>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_180px_120px] lg:items-center">
                <div>
                  <p className="font-medium">{incident.title}</p>
                  <p className="text-sm text-slate-500">{incident.summary}</p>
                </div>
                <span className="text-sm text-slate-600">{incident.service} / {incident.owner}</span>
                <Button asChild variant="outline" size="sm">
                  <Link href={incident.id === "INC-1042" ? "/incidents/INC-1042" : "/incidents"}>Investigate</Link>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
