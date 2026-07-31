import { supabaseAdmin } from "@/lib/supabase/service";
import { NextResponse, NextRequest } from "next/server";

interface Service {
    id: string;
    team_id: string;
    name: string;
    base_url: string;
}

export async function checkHealth(services: Service[]) {
    //  const { data: services } = await supabaseAdmin
    //         .from("services")
    //         .select("id, team_id, name, base_url");

    if (!services || services.length === 0) {
        return NextResponse.json({ error: "No services found" });
    }

    for (const service of services) {
        const health = await Healthstats(service.base_url);
        const { data: incident } = await supabaseAdmin
            .from("incidents")
            .select("*")
            .eq("source", "health")
            .eq("source_reference", service.id)
            .eq("status", "Active")
            .maybeSingle();

        if (!health.ok) {
            if (!incident) {
                const { data: created } = await supabaseAdmin
                    .from("incidents")
                    .insert({
                        team_id: service.team_id,
                        service_id: service.id,

                        title: "Service Unavailable",

                        severity: "SEV-1",

                        status: "Active",

                        summary: `${service.name} health endpoint returned ${health.status}`,

                        source: "health",

                        source_reference: service.id,

                        ai_metadata: {
                            url: `${service.base_url}/health`
                        }
                    })
                    .select()
                    .single();

                await supabaseAdmin
                    .from("incident_events")
                    .insert({

                        incident_id: created.id,

                        source: "health",

                        event: "Health check failed",

                        provenance: {
                            status: health.status,
                            url: `${service.base_url}/health`
                        }
                    });

            }

        }

        if (health.ok && incident) {

            await supabaseAdmin
                .from("incidents")
                .update({

                    status: "Resolved",

                    resolved_at: new Date().toISOString()

                })
                .eq("id", incident.id);

            await supabaseAdmin
                .from("incident_events")
                .insert({

                    incident_id: incident.id,

                    source: "health",

                    event: "Service recovered",

                    provenance: {
                        status: 200
                    }

                });

        }
    }
}

async function Healthstats(baseUrl: string) {
    try {
        const response = await fetch(`${baseUrl}/health`, {
            signal: AbortSignal.timeout(5000),
        });

        return {
            ok: response.ok,
            status: response.status,
        };
    } catch {
        return {
            ok: false,
            status: 0,
        };
    }
}