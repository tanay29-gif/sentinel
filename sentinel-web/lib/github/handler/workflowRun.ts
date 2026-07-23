import type { handleWorkflowRunPayload, WorkflowRunRecord} from "@/lib/interface";
import { supabaseAdmin } from "@/lib/supabase/service";
import { getInstallationClient } from "@/lib/github/github-app";
import { NextResponse } from "next/server";



export default async function handleWorkflowRun(payload: handleWorkflowRunPayload) {
  const repository = payload.repository;

  console.log("repository_id", repository.id);
  // add it into the tablel there is change so add it

  const { data: repositoryRecord, error: repositoryError } =
    await supabaseAdmin
      .from("repositories")
      .select("id, team_id")
      .eq("full_name", repository.full_name)
      .eq("provider", "github")
      .single();

  if (repositoryError) {
    console.error("Repository not registered:", repository.full_name);
    return NextResponse.json({ success: false, message: "Repository not registered" });
  }

  console.log("repository fetched", repositoryRecord.team_id);

  const {data: workflowRunRecord, error: workflowRunError} = await supabaseAdmin
    .from("workflow_runs")
    .upsert({
      github_run_id: payload.workflow_run.id,
      team_id: repositoryRecord.team_id,
      provider: "github",
      workflow_name: payload.workflow_run.name,
      status: payload.workflow_run.status,
      conclusion: payload.workflow_run.conclusion,
      event: payload.workflow_run.event,
      branch: payload.workflow_run.head_branch,
      commit_sha: payload.workflow_run.head_sha,
      actor: payload.workflow_run.actor.login,
      repository_id: repositoryRecord.id,
      started_at: payload.workflow_run.run_started_at,
      completed_at:
        payload.workflow_run.status === "completed"
          ? payload.workflow_run.updated_at
          : null,
      html_url: payload.workflow_run.html_url,
      // run_attempt: payload.workflow_run.run_attempt,
      // run_number: payload.workflow_run.run_number,
    }, { onConflict: "github_run_id" })
    .select("id")
    .single();

    // const workflowRunRecord = workflowRun as WorkflowRunRecord;



if (workflowRunError || !workflowRunRecord) {
  console.error("Error or no record found:", workflowRunError);
  return NextResponse.json({ success: false, message: "Error or no record found of actions" }); 
}

console.log("Workflow table created", workflowRunRecord.id);

  if (payload.workflow_run.conclusion !== "failure") {
    if (payload.workflow_run.conclusion === "success") {
      return NextResponse.json({ success: true, message: "Workflow run processed successfully" });
    } else if (payload.workflow_run.conclusion === null) {
      return NextResponse.json({ success: true, message: "Workflow run is still in progress" });
    }
    return NextResponse.json({ success: true, message: `Workflow run is ${payload.workflow_run.conclusion}` });

  }

  console.log("canme to failure part");

  const { data: teamData, error: teams_error } = await supabaseAdmin
    .from("teams")
    .select("github_installation_id")
    .eq("repository_name", repository.full_name)
    .single();

  if (teams_error || !teamData?.github_installation_id) {
    console.error("GitHub installation ID not found for team:", repositoryRecord.team_id);
    return NextResponse.json({ success: false, message: "GitHub installation ID not found" });
  }

  console.log("github_installation_id", teamData.github_installation_id);

  const octokit = await getInstallationClient(teamData.github_installation_id);

  const { data: workflowJobsData } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
    {
      owner: repository.owner.login,
      repo: repository.name,
      run_id: payload.workflow_run.id,
    }
  );

  if (workflowJobsData.jobs.length === 0) {
    console.warn("No jobs found for workflow run:", payload.workflow_run.id);
    return NextResponse.json({ success: false, message: "No jobs found for workflow run" });
  }

  console.log("came to the jobs_update part");

  for (const job of workflowJobsData.jobs) {
    if (job.conclusion !== "failure") continue;

    const { data: workflowJobRecord, error: workflowJobError } =
      await supabaseAdmin
        .from("workflow_jobs")
        .upsert(
          {
            workflow_run_id: workflowRunRecord.id,

            github_run_id: payload.workflow_run.id,

            github_job_id: job.id,

            name: job.name,

            status: job.status,

            conclusion: job.conclusion,

            runner_name: job.runner_name,

            runner_group_name: job.runner_group_name,

            started_at: job.started_at,

            completed_at: job.completed_at,

            html_url: job.html_url,
          },
          {
            onConflict: "github_job_id",
          }
        )
        .select("id")
        .single();

    if (workflowJobError) {
      console.error(workflowJobError);
      continue;
    }
    if (!job.steps || job.steps?.length === 0) {
      console.warn("No steps found for job:", job.id);
      continue;
    }

    for (const step of (job.steps ?? [])) {
      if (step.conclusion !== "failure") continue;

      await supabaseAdmin
        .from("workflow_steps")
        .upsert(
          {
            workflow_job_id: workflowJobRecord.id,

            step_number: step.number,

            step_name: step.name,

            status: step.status,

            conclusion: step.conclusion,

            started_at: step.started_at,

            completed_at: step.completed_at,
          },
          {
            onConflict: "workflow_job_id,step_number",
          }
        );
        console.log("workflow_jobs and the steps created", workflowJobRecord.id);
    }
  }


  try{
  const { url: redirectUrl } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/logs",
    {
     owner: repository.owner.login,
      repo: repository.name,
      run_id: payload.workflow_run.id,
    }
  );

  // 2. Fetch the actual ZIP file binary using the redirect URL
  // Next.js 'fetch' works perfectly here on the server
  const logZipResponse = await fetch(redirectUrl);

  if (!logZipResponse.ok) {
    throw new Error(`Failed to download logs: ${logZipResponse.statusText}`);
  }

  // Convert the response to a Buffer (Node.js/Next.js standard for binary)
  const arrayBuffer = await logZipResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const storagePath = `workflow-logs/${repositoryRecord.team_id}/${payload.workflow_run.id}.zip`;

  // 3. Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from("sentinel_logs") // Make sure this bucket exists
    .upload(storagePath, buffer, {
      contentType: "application/zip",
      upsert: true,
    });

  if (uploadError) throw uploadError;
  console.log("log uploaded to the storage");

  // 4. Insert metadata into the Database
  const { error: dbError } = await supabaseAdmin
    .from("workflow_logs") // Your table name
    .insert({
      workflow_run_id: workflowRunRecord.id,
      team_id: repositoryRecord.team_id,
      repository_id: repositoryRecord.id,
      source: "github",
      storage_path: storagePath,
      size: buffer.length,
      created_at: new Date().toISOString(),
    });

  if (dbError) throw dbError;

  return new Response(JSON.stringify({ success: true }), { status: 200 });

} catch (error : any) {
  console.error("Log Storage Error:", error);
  return new Response(JSON.stringify({ error: error.message }), { status: 500 });
}
}