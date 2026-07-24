import { supabaseAdmin } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export default async function handleDeployment(payload: any) {
  const { deployment, deployment_status, repository, workflow_run } = payload;

  // 1. Get our internal repository and team IDs
  const { data: repositoryRecord } = await supabaseAdmin
    .from("repositories")
    .select("id, team_id")
    .eq("full_name", repository.full_name)
    .single();

  if (!repositoryRecord){
    console.error("Repo not found:", repository.full_name);
     return NextResponse.json({ error: "Repo not found" });
  }

  const { data: workflowRunRecord, error: workflowRunError} = await supabaseAdmin
    .from("workflow_runs")
    .select("id")
    .eq("github_run_id", workflow_run?.id)
    .single();

  if(workflowRunError || !workflowRunRecord){
    console.error("Workflow Run not found:", workflow_run?.id);
    return NextResponse.json({status:200, error: "Workflow Run not found" });
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

  return NextResponse.json({ success: true });
}
