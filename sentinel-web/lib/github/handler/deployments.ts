import { supabaseAdmin } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export default async function handleDeployment(payload: any) {
  const { deployment, deployment_status, repository } = payload;

  // 1. Get our internal repository and team IDs
  const { data: repositoryRecord } = await supabaseAdmin
    .from("repositories")
    .select("id, team_id")
    .eq("full_name", repository.full_name)
    .single();

  if (!repositoryRecord) return NextResponse.json({ error: "Repo not found" });

  // 2. Map the URLs correctly from the deployment_status object
  const deployUrl = deployment_status.environment_url;
  const logUrl = deployment_status.log_url || deployment_status.target_url;

  // 3. Upsert into Supabase
  const { error } = await supabaseAdmin
    .from("deployments")
    .upsert({
      github_deployment_id: deployment.id,
      github_run_id: deployment_status.workflow_run?.id || null,
      status: deployment_status.state,
      
      // CAPTURE THE DESCRIPTION HERE
      description: deployment_status.description, 
      
      environment: deployment.environment,
      commit_sha: deployment.sha,
      environment_url: deployment_status.environment_url, 
      log_url: deployment_status.log_url || deployment_status.target_url,
      
      team_id: repositoryRecord.team_id,
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
