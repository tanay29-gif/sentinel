import { supabaseAdmin } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { IncidentInput } from "@/lib/interface";


export default async function handleDeployment(payload: any) {
  const { deployment, deployment_status, repository, workflow_run } = payload;

  // 1. Get our internal repository and team IDs
  // export const IncidentInput: IncidentInput = {
  //   source: "deployment_status",
  //   serviceId: repository.full_name,
  //   timestamp: new Date(),
  //   payload:payload
  // }

  const { data: repositoryRecord } = await supabaseAdmin
    .from("repositories")
    .select("id, team_id")
    .eq("full_name", repository.full_name)
    .single();

  if (!repositoryRecord) {
    console.error("Repo not found:", repository.full_name);
    return NextResponse.json({ error: "Repo not found" });
  }

  const { data: workflowRunRecord, error: workflowRunError } = await supabaseAdmin
    .from("workflow_runs")
    .select("id")
    .eq("github_run_id", workflow_run?.id)
    .single();

  if (workflowRunError || !workflowRunRecord) {
    console.error("Workflow Run not found:", workflow_run?.id);
    return NextResponse.json({ status: 200, error: "Workflow Run not found" });
  }

  // 3. Upsert into Supabase
  const { error } = await supabaseAdmin
    .from("deployments")
    .upsert({
      github_deployment_id: deployment.id,
      github_run_id: workflow_run?.id || null,
      status: deployment_status.state,
      workflow_run_id: workflowRunRecord?.id || null,
      // CAPTURE THE DESCRIPTION HERE
      description: deployment_status.description,

      environment: deployment.environment,
      commit_sha: deployment.sha,
      environment_url: deployment_status.environment_url,
      log_url: deployment_status.log_url || deployment_status.target_url,

      team_id: repositoryRecord.team_id,
      repository_full_name: repository.full_name,
      repository_id: repositoryRecord.id,
      updated_at: new Date().toISOString()
    }, {
      onConflict: "github_deployment_id"
    });


  if (error) {
    console.error("Deployment DB Error:", error);
    return NextResponse.json({ success: false, error: error.message });
  }
  if (
    deployment_status.state !== "failure" &&
    deployment_status.state !== "error"
  ) {
    return NextResponse.json({ success: true });
  }

  const { data: existingIncident } = await supabaseAdmin
    .from("incidents")
    .select("id")
    .eq("source", "deployment")
    .eq("source_reference", deployment.id.toString())
    .maybeSingle();

  if (existingIncident) {
    return NextResponse.json({ success: true });
  }

  let severity = "SEV-4";

  switch (deployment.environment) {
    case "production":
      severity = "SEV-1";
      break;

    case "staging":
      severity = "SEV-2";
      break;

    case "testing":
      severity = "SEV-3";
      break;

    default:
      severity = "SEV-4";
  }



  const { data: incident, error: incidentError } = await supabaseAdmin
    .from("incidents")
    .insert({

      team_id: repositoryRecord.team_id,

      service_id: null,

      title: "Deployment Failed",

      severity,

      status: "Active",

      summary: `${repository.full_name} deployment to ${deployment.environment} failed.`,

      root_cause_suggestion: "",

      ai_metadata: {
        deploymentId: deployment.id,
        workflowRunId: workflow_run?.id,
        repository: repository.full_name,
        environment: deployment.environment
      },

      source: "deployment",

      source_reference: deployment.id.toString()

    })
    .select()
    .single();

  if (incidentError) {
    return NextResponse.json(
      {
        success: false,
        error: incidentError.message,
      },
      {
        status: 500,
      }
    );
  }

  await supabaseAdmin
    .from("incident_events")
    .insert({
      incident_id: incident.id,

      source: "github",

      event: `Deployment to ${deployment.environment} failed`,

      provenance: {
        deploymentId: deployment.id,
        workflowRunId: workflow_run?.id,
        repository: repository.full_name,
        environment: deployment.environment,
        status: deployment_status.state,
        description: deployment_status.description,
        commit: deployment.sha,
        logUrl:
          deployment_status.log_url ??
          deployment_status.target_url ??
          null,
        environmentUrl: deployment_status.environment_url ?? null,
      },
    });



  return NextResponse.json({ success: true });
}
