"use client"
import { useEffect, useState } from "react";
import { ServiceCard } from "@/components/sentinel/service-box";
import { fetchServiceMetrics, type ServiceMetrics } from "@/lib/supabase/grafana-data";

interface Service {
    id: string;
    name: string;
}

interface ServiceListProps {
    ServicesNames: Service[];
    allMetrics: Record<string, ServiceMetrics>; // Initial 14-day data from Server
}

export default function ServiceListClient({ ServicesNames, allMetrics }: ServiceListProps) {
    // This state holds the 14-day history AND the live status
    const [metrics, setMetrics] = useState<Record<string, ServiceMetrics>>(allMetrics || {});

    useEffect(() => {
        const fetchLiveUpdate = async () => {
            try {
                const names = ServicesNames.map((s: Service) => s.name);
                
                // 1. Fetch ONLY the 5-minute live snapshot
                const liveData = await fetchServiceMetrics(names, 'live');
                
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

        // Poll every 60 seconds for the "Live" status dot
        const interval = setInterval(fetchLiveUpdate, 60000); 
        return () => clearInterval(interval);
    }, [ServicesNames]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        status={m?.currentStatus ?? "operational"}
                        lastLatency={m?.lastLatency ?? 0}
                        lastErrorRate={m?.lastErrorRate ?? "0.00"}
                    />
                );
            })}
        </div>
    );
}