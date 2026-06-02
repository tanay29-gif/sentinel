import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { incidents, logs, tasks, timeline } from "@/lib/data";

export default function IncidentDetailPage() {
  const incident = incidents[0];

  return (
    <AppShell>
      <PageHeader eyebrow={`${incident.id} / ${incident.service}`} title={incident.title} action="Escalate" />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>AI Incident Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive">{incident.severity}</Badge>
              <Badge variant="outline">{incident.status}</Badge>
              <Badge variant="secondary">Commander: {incident.owner}</Badge>
              <Badge variant="outline">SLA {incident.sla}</Badge>
            </div>
            <p className="text-sm text-slate-600">{incident.summary}</p>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-medium">Root-cause suggestion</p>
              <p className="mt-2">{incident.rootCause}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Button>Assign rollback</Button>
              <Button variant="outline">Generate postmortem</Button>
              <Button variant="outline">Create Jira tasks</Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Incident Channel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md bg-slate-50 p-3 text-sm">
              <p className="font-medium">Asha</p>
              <p className="text-slate-600">Rollback prepared. Comparing cache miss ratio before deploy.</p>
            </div>
            <div className="rounded-md bg-emerald-50 p-3 text-sm">
              <p className="font-medium">Sentinel AI</p>
              <p className="text-emerald-800">New evidence: timeout traces share commit 4f9c2a1 and product_detail cache misses.</p>
            </div>
            <Textarea placeholder="Write an update to the incident channel..." />
            <Button className="w-full">Send update</Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="rounded-md xl:col-span-2">
          <CardHeader>
            <CardTitle>Timeline With Provenance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.map((item) => (
              <div key={`${item.time}-${item.source}`} className="grid grid-cols-[64px_100px_1fr] gap-3 rounded-md border border-slate-200 p-3 text-sm">
                <span className="font-mono text-slate-500">{item.time}</span>
                <Badge variant="outline">{item.source}</Badge>
                <span>{item.event}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>SLA Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.map((task) => (
              <div key={task.title} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant={task.priority === "P0" ? "destructive" : "outline"}>{task.priority}</Badge>
                  <span className="text-slate-500">{task.due}</span>
                </div>
                <p className="mt-2 font-medium">{task.title}</p>
                <p className="text-slate-500">{task.assignee} / {task.status}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4 rounded-md">
        <CardHeader>
          <CardTitle>Correlated Logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {logs.map((log) => (
            <div key={log.trace} className="grid gap-2 rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-100 md:grid-cols-[72px_140px_1fr_90px]">
              <span className={log.level === "ERROR" ? "text-red-300" : "text-amber-300"}>{log.level}</span>
              <span>{log.service}</span>
              <span>{log.message}</span>
              <span className="text-slate-400">{log.trace}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
