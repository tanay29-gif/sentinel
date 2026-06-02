import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { MetricCard } from "@/components/sentinel/metric-card";
import { PageHeader } from "@/components/sentinel/page-header";
import { services } from "@/lib/data";

export default function ServicesPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Runtime health" title="Service Uptime Monitoring" action="Add service" />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Global uptime" value="99.93%" detail="Last 30 days" icon={Activity} tone="emerald" />
        <MetricCard title="Avg latency" value="337ms" detail="Across production APIs" icon={Activity} tone="amber" />
        <MetricCard title="Error budget" value="64%" detail="Remaining this month" icon={Activity} tone="slate" />
      </section>
      <Card className="mt-4 rounded-md">
        <CardHeader><CardTitle>Services</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {services.map((service) => (
            <div key={service.name} className="rounded-md border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{service.name}</p>
                <Badge variant={service.health === "Healthy" ? "secondary" : "destructive"}>{service.health}</Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-emerald-600" style={{ width: service.uptime.replace("%", "") + "%" }} />
              </div>
              <div className="mt-3 grid grid-cols-3 text-sm text-slate-500">
                <span>{service.uptime} uptime</span>
                <span>{service.latency}ms p95</span>
                <span>{service.errorRate} errors</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
