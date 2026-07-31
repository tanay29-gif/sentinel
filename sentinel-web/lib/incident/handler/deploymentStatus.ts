import { supabaseAdmin } from "@/lib/supabase/service";

export async function checkDeploymentStatus() {
    // Step 1: Query recent deployment statuses (10 minute window)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: deployments, error } = await supabaseAdmin
        .from("deployment_status")
        .select("*")
        .gte("created_at", tenMinutesAgo);

    if (error || !deployments) {
        if (error) console.error("Error fetching deployments:", error);
        return;
    }

    // Step 2: Loop
    for (const deployment of deployments) {
        // Based on your JSON sample, we check the 'status' field
        if (deployment.status === "failure") {
            await handleDeploymentFailure(deployment);
        }

        if (deployment.status === "success") {
            await handleDeploymentSuccess(deployment);
        }
    }
}

/**
 * Step 3, 4 & 5: Handle Failure
 */
async function handleDeploymentFailure(deployment: any) {
    // Step 3: Prevent duplicates
    const { data: existingIncident } = await supabaseAdmin
        .from("incidents")
        .select("id")
        .eq("team_id", deployment.team_id)
        .eq("title", "Deployment Failed")
        .eq("status", "Active")
        .maybeSingle();

    if (existingIncident) return;

    // Step 4: Create Incident (SEV-2)
    const { data: created, error: createErr } = await supabaseAdmin
        .from("incidents")
        .insert({
            team_id: deployment.team_id,
            service_id: null, // Correct: can't reliably tell service from webhook yet
            title: "Deployment Failed",
            severity: "SEV-2",
            status: "Active",
            summary: `Deployment to ${deployment.environment} failed.`
        })
        .select()
        .single();

    if (createErr || !created) return;

    // Step 5: Add Incident Event with full Provenance
    await supabaseAdmin.from("incident_events").insert({
        incident_id: created.id,
        source: "github",
        event: "Deployment failed",
        provenance: {
            deploymentId: deployment.github_deployment_id,
            repositoryId: deployment.repository_id,
            environment: deployment.environment,
            state: deployment.status,
            sha: deployment.commit_sha,
            url: deployment.log_url // from your JSON snippet
        }
    });
}

/**
 * Step 6: Handle Success (Resolve)
 */
async function handleDeploymentSuccess(deployment: any) {
    // Check if an active incident exists for this team
    const { data: incident } = await supabaseAdmin
        .from("incidents")
        .select("id")
        .eq("team_id", deployment.team_id)
        .eq("title", "Deployment Failed")
        .eq("status", "Active")
        .maybeSingle();

    // If no incident exists, nothing to resolve
    if (!incident) return;

    // Update incident to Resolved
    await supabaseAdmin
        .from("incidents")
        .update({
            status: "Resolved",
            resolved_at: new Date().toISOString()
        })
        .eq("id", incident.id);

    // Record the resolution event
    await supabaseAdmin.from("incident_events").insert({
        incident_id: incident.id,
        source: "github",
        event: "Deployment succeeded",
        provenance: {
            deploymentId: deployment.github_deployment_id,
            sha: deployment.commit_sha,
            environment: deployment.environment
        }
    });
}