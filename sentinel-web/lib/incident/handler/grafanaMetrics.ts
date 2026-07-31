import { supabaseAdmin } from "@/lib/supabase/service";
import { fetchServiceMetrics } from "@/lib/grafana/grafana-data";

interface Service {
    id: string;
    team_id: string;
    name: string;
    base_url: string;
}

const THRESHOLDS = {
    ERROR_RATE: 20,
    LATENCY: 2000,
};

const INCIDENT_TITLES = {
    ERROR: "High Error Rate",
    LATENCY: "High Latency",
    HEALTH: "Service Unavailable", // The title used by your health check system
};

export async function checkGrafanaMetrics(services: Service[]) {
    const names = services.map((service) => service.name);
    const metricsMap = await fetchServiceMetrics(names, "live");

    for (const service of services) {
        const metrics = metricsMap[service.name];
        if (!metrics) continue;

        const errorRate = Number(metrics.lastErrorRate ?? 0);
        const latency = Number(metrics.lastLatency ?? 0);

        // --- Handle High Error Rate (SEV-1) ---
        await handleIncidentLogic({
            service,
            currentValue: errorRate,
            threshold: THRESHOLDS.ERROR_RATE,
            title: INCIDENT_TITLES.ERROR,
            severity: "SEV-1",
            detectMessage: `Error rate is ${errorRate.toFixed(2)}%`,
            resolveMessage: "Error rate back to normal",
            metricKey: "errorRate"
        });

        // --- Handle High Latency (SEV-2) ---
        await handleIncidentLogic({
            service,
            currentValue: latency,
            threshold: THRESHOLDS.LATENCY,
            title: INCIDENT_TITLES.LATENCY,
            severity: "SEV-2",
            detectMessage: `High latency detected: ${latency.toFixed(0)}ms`,
            resolveMessage: "Latency back to normal",
            metricKey: "latency"
        });
    }
}

async function handleIncidentLogic({
    service,
    currentValue,
    threshold,
    title,
    severity,
    detectMessage,
    resolveMessage,
    metricKey
}: {
    service: Service;
    currentValue: number;
    threshold: number;
    title: string;
    severity: string;
    detectMessage: string;
    resolveMessage: string;
    metricKey: string;
}) {
    const incident = await getOpenIncident(service.id, metricKey);

    if (currentValue > threshold) {
        // If metric is bad, but incident doesn't exist yet
        if (!incident) {

            // --- Step 6: Health vs Grafana Check ---
            // Check if the service is already completely down (Service Unavailable)
            const { data: healthIncident } = await supabaseAdmin
                .from("incidents")
                .select("id")
                .eq("source", "health")
                .eq("source_reference", service.id)
                .eq("status", "Active")
                .maybeSingle();

            // If a "Service Unavailable" incident is active, skip creating redundant Grafana incidents
            if (healthIncident) {
                console.log(`Skipping ${title} for ${service.name} because service is already Unavailable.`);
                return;
            }

            // Create incident
            const { data: created } = await supabaseAdmin
                .from("incidents")
                .insert({
                    team_id: service.team_id,

                    service_id: service.id,

                    title,

                    severity,

                    status: "Active",

                    summary: detectMessage,

                    source: "grafana",

                    source_reference: `${service.id}:${metricKey}`,

                    ai_metadata: {
                        metric: metricKey,
                        value: currentValue,
                        threshold
                    },

                    created_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (created) {
                await supabaseAdmin.from("incident_events").insert({
                    incident_id: created.id,
                    source: "grafana",
                    event: title,
                    provenance: {
                        service: service.name,
                        metric: metricKey,
                        value: currentValue,
                        threshold,
                    },
                });
            }
        }
    } else {
        // Resolve logic remains the same
        if (incident) {
            await supabaseAdmin
                .from("incidents")
                .update({
                    status: "Resolved",
                    resolved_at: new Date().toISOString(),
                })
                .eq("id", incident.id);

            await supabaseAdmin.from("incident_events").insert({
                incident_id: incident.id,
                source: "grafana",
                event: resolveMessage,
                provenance: {
                    service: service.name,
                    metric: metricKey,
                    value: currentValue,
                },
            });
        }
    }
}

async function getOpenIncident(serviceId: string, metricKey: string) {
    const { data } = await supabaseAdmin
        .from("incidents")
        .select("*")
        .eq("source", "grafana")
        .eq("source_reference", `${serviceId}:${metricKey}`)
        .eq("status", "Active")
        .maybeSingle();

    return data;
}