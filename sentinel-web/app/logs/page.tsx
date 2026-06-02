import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { logs } from "@/lib/data";

export default function LogsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Observability" title="Centralized Logs & Alerts" action="Add alert rule" />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="rounded-md">
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="service:checkout-api" />
            {["ERROR", "WARN", "INFO", "ap-south-1", "prod"].map((item) => (
              <Badge key={item} variant="outline" className="mr-2">{item}</Badge>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader><CardTitle>Live Log Stream</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {logs.map((log) => (
              <div key={log.trace} className="grid gap-2 rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-100 md:grid-cols-[76px_100px_140px_1fr]">
                <span className="text-slate-400">{log.time}</span>
                <span className={log.level === "ERROR" ? "text-red-300" : log.level === "WARN" ? "text-amber-300" : "text-emerald-300"}>{log.level}</span>
                <span>{log.service}</span>
                <span>{log.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
