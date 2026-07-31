"use client"
import { useEffect, useState } from "react";
import { ServiceCard } from "@/components/sentinel/service-box";
import { fetchServiceMetrics, type ServiceMetrics } from "@/lib/grafana/grafana-data";
import type { Service, ServiceListProps } from "@/lib/interface";
import { createClient } from "@/lib/supabase/client";




export async function fetchLogs(service: string) {
    const response = await fetch(
        `/api/grafana/logs?service=${service}`
    );

    if (!response.ok)
        throw new Error("Failed to fetch logs");

    return response.json();
}



export default function ServiceListClient({ ServicesNames, allMetrics }: ServiceListProps) {
    // This state holds the 14-day history AND the live status

    const supabase = createClient();
    const [metrics, setMetrics] = useState<Record<string, ServiceMetrics>>(allMetrics || {});



    useEffect(() => {
        const servicesMap = Object.fromEntries(
            ServicesNames.map(service => [service.name, service])
        );

        async function getHealthStatus(
            baseUrl: string,
            metrics?: ServiceMetrics
        ): Promise<"operational" | "offline" | "no-data"> {
            try {
                // console.log("fetching =", `${baseUrl}/health`);
                const response = await fetch(
                    `/api/health?baseUrl=${encodeURIComponent(baseUrl)}`
                );

                const data = await response.json();
                
                // console.log(response);

                if (!data.ok) {
                    return "offline";
                }

                // Service is alive but Prometheus has no telemetry
                if (!metrics || metrics.currentStatus === "no-data") {
                    return "no-data";
                }

                return "operational";
            } catch {
                return "offline";
            }
        }

        const fetchLiveUpdate = async () => {
            try {
                const names = ServicesNames.map(s => s.name);

                // Fetch latest Grafana metrics
                const liveData = await fetchServiceMetrics(names, "live");

                // Update database
                await Promise.all(
                    Object.keys(liveData).map(async (name) => {
                        const service = servicesMap[name];

                        if (!service) return;

                        const health = await getHealthStatus(
                            service.base_url,
                            liveData[name]
                        );

                        const { error } = await supabase
                            .from("services")
                            .update({
                                health,
                                uptime: allMetrics[name]?.uptimePercentage ?? 0,
                            })
                            .eq("id", service.id);

                        if (error) {
                            console.error(`Failed to update ${name}`, error);
                        }

                        // Override the live status for the UI
                        liveData[name].currentStatus = health;
                    })
                );

                setMetrics(prev => {
                    const newMetrics = { ...prev };

                    Object.keys(liveData).forEach(name => {

                        if (newMetrics[name]) {
                            // 2. UPDATE only the live indicators
                            newMetrics[name] = {
                                ...newMetrics[name], // Keep existing dailyHistory and uptimePercentage
                                currentStatus: liveData[name].currentStatus,
                                lastLatency: liveData[name].lastLatency,
                                lastErrorRate: liveData[name].lastErrorRate,
                                requestRate: liveData[name].requestRate

                            };
                        } else {
                            newMetrics[name] = liveData[name];
                        }
                    });




                    return newMetrics;
                });
            } catch (err) {
                console.error("Live status update failed", err);
            }
        };

        fetchLiveUpdate();
        // Poll every 60 seconds for the "Live" status dot
        const interval = setInterval(fetchLiveUpdate, 360000);
        return () => clearInterval(interval);
    }, [ServicesNames, allMetrics, supabase]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ServicesNames.map((service: Service) => {
                const m = metrics[service.name];

                return (
                    <ServiceCard
                        key={service.id}
                        serviceName={service.name}
                        // HISTORICAL DATA (from initial fetch)
                        uptime={m?.uptimePercentage ?? 100}
                        history={m?.dailyHistory ?? []}

                        // LIVE DATA (from polling)
                        status={m?.currentStatus ?? "no-data"}
                        lastLatency={m?.lastLatency ?? 0}
                        lastErrorRate={m?.lastErrorRate ?? "0.00"}
                        requestRate={m?.requestRate ?? 0}
                    />
                );
            })}
        </div>
    );
}