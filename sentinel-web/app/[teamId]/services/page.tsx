import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { MetricCard } from "@/components/sentinel/metric-card";
import { PageHeader } from "@/components/sentinel/page-header";
import { services } from "@/lib/data";
import AddServiceSidebar from "@/components/sentinel/service-sidebar";
import { ServiceCard } from "@/components/sentinel/service-box";
import { fetchServiceMetrics } from "@/lib/grafana/grafana-data";
import { createClient } from "@/lib/supabase/server";
import ServiceList from "./ServiceList";
import type {Service} from "@/lib/interface";


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
    let serviceNames: { id: string; name: string }[] = dbServices?.map(s => {return { id: s.id, name: s.name }}) || [];

    // 2. ONLY query the API if we actually have services to monitor
    if (dbServices && dbServices.length > 0) {
        try {
            const serviceNames = dbServices.map(s => s.name);
            
            allMetrics = await fetchServiceMetrics(serviceNames, 'range');

        } catch (error) {
            console.error("Failed to fetch Grafana metrics:", error);

        }
    }
    
   

  return (
    <AppShell params={params}>
      <PageHeader eyebrow="Runtime health" title="Service Uptime Monitoring" action={<AddServiceSidebar />} />
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Global uptime" value="99.93%" detail="Last 30 days" icon={Activity} tone="emerald" />
        <MetricCard title="Avg latency" value="337ms" detail="Across production APIs" icon={Activity} tone="amber" />
        <MetricCard title="Error budget" value="64%" detail="Remaining this month" icon={Activity} tone="slate" />
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
