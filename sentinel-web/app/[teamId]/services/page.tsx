import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { MetricCard } from "@/components/sentinel/metric-card";
import { PageHeader } from "@/components/sentinel/page-header";
import { services } from "@/lib/data";
import AddServiceSidebar from "@/components/sentinel/service-sidebar";
import { getGrafanaMetrics } from "@/lib/grafana/grafana-client";
import { processGrafanaData } from "@/lib/grafana/grafana-data";
import { createClient } from "@/lib/supabase/server";
import ServiceList from "./ServiceList";
import type { Service } from "@/lib/interface";


export default async function ServicesPage({ params }: { params: Promise<{ teamId: string }> }) {

  const { teamId } = await params;
  const supabase = await createClient();

  // 3. Fetch services filtered by the ID in the URL
  const { data: dbServices, error } = await supabase
    .from('services')
    .select('*')
    .eq('team_id', teamId); // Uses the ID from the URL

  if (error) {
    console.error("Error fetching services:", error);
  }

  let allMetrics: Record<string, any> = {};
  let serviceNames: { id: string; name: string, base_url: string}[] = dbServices?.map(s => { return { id: s.id, name: s.name, base_url: s.base_url } }) || [];
  let globalUptime = "0.00";
  let averageLatency = 0;
  let errorBudget = "100.00";


  // 2. ONLY query the API if we actually have services to monitor
  if (dbServices && dbServices.length > 0) {
    try {
      const serviceNames = dbServices.map(s => s.name);


      const raw =
        await getGrafanaMetrics(
          serviceNames,
          "range"
        );

      allMetrics = await processGrafanaData(
        raw,
        serviceNames
      );

      const metrics = Object.values(allMetrics);

      const activeServices = metrics.filter(
        (m) => m.currentStatus !== "no-data"
      );

       globalUptime =
        activeServices.length > 0
          ? (
            activeServices.reduce(
              (sum, m) => sum + m.uptimePercentage,
              0
            ) / activeServices.length
          ).toFixed(2)
          : "0.00";

       averageLatency =
        activeServices.length > 0
          ? Math.round(
            activeServices.reduce(
              (sum, m) => sum + m.lastLatency,
              0
            ) / activeServices.length
          )
          : 0;

       errorBudget =
        activeServices.length > 0
          ? (
            100 -
            activeServices.reduce(
              (sum, m) => sum + Number(m.lastErrorRate),
              0
            ) / activeServices.length
          ).toFixed(2)
          : "0";

    } catch (error) {
      console.error("Failed to fetch Grafana metrics:", error);

    }
  }



  return (
<AppShell teamId={teamId}>      <PageHeader eyebrow="Runtime health" title="Service Uptime Monitoring" action={<AddServiceSidebar />} />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Global uptime" value={globalUptime} detail="Last 30 days" icon={Activity} tone="emerald" />
        <MetricCard title="Avg latency" value={averageLatency.toString()}detail="Across production APIs" icon={Activity} tone="amber" />
        <MetricCard title="Error budget" value={errorBudget} detail="Remaining this month" icon={Activity} tone="slate" />
      </section>
      <Card className="mt-4 rounded-md">
        <CardHeader><CardTitle>Services</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <ServiceList
            ServicesNames={serviceNames}
            allMetrics={allMetrics}
          />
        </CardContent>
      </Card>
    </AppShell>
  );
}
