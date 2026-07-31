import { supabaseAdmin } from "@/lib/supabase/service";

export async function checkWorkflowRuns() {
  // Step 1: Query runs completed in the last minute
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  const { data: runs, error } = await supabaseAdmin
    .from("workflow_runs")
    .select("*")
    .eq("status", "completed")
    .gte("completed_at", tenMinutesAgo);

  if (error || !runs) return;

  for (const run of runs) {
    if (run.conclusion === "failure") {
      // Step 2 & 3: Process failure and prevent duplicates
      await handleWorkflowFailure(run);
    } else if (run.conclusion === "success") {
      // Step 9: Resolve if a new run succeeds
      await resolveWorkflowIncident(run);
    }
  }
}

async function handleWorkflowFailure(run: any) {
  // Step 3: Prevent duplicates (Check for Active incident for this specific workflow/branch)
  const { data: existingIncident } = await supabaseAdmin
    .from("incidents")
    .select("id")
    .eq("team_id", run.team_id)
    .eq("title", "Workflow Failed")
    .eq("status", "Active")
    // We filter by summary or provenance usually, but for MVP we check if ANY workflow is failing for the team
    // or add a filter for the specific workflow name in the summary:
    .ilike("summary", `%${run.workflow_name}%`) 
    .maybeSingle();

  if (existingIncident) return;

  // Step 4: Create the incident
  const { data: created, error: createError } = await supabaseAdmin
    .from("incidents")
    .insert({
      team_id: run.team_id,
      service_id: null, // Workflow runs aren't tied to a specific service ID usually
      title: "Workflow Failed",
      severity: "SEV-3",
      status: "Active",
      summary: `${run.workflow_name} failed on branch ${run.branch}`,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (createError || !created) return;

  // Step 5: Find failed jobs
  const { data: jobs } = await supabaseAdmin
    .from("workflow_jobs")
    .select("*")
    .eq("workflow_run_id", run.id)
    .eq("conclusion", "failure");

  // Step 6: Find failed steps
  const failedSteps = [];
  if (jobs) {
    for (const job of jobs) {
      const { data: steps } = await supabaseAdmin
        .from("workflow_job_steps")
        .select("*")
        .eq("workflow_job_id", job.id)
        .eq("conclusion", "failure");

      if (steps) failedSteps.push(...steps);
    }
  }

  // Step 7: Get log file reference
  const { data: log } = await supabaseAdmin
    .from("workflow_logs")
    .select("*")
    .eq("workflow_run_id", run.id)
    .maybeSingle();

  // Step 8: Create incident event with Provenance
  await supabaseAdmin.from("incident_events").insert({
    incident_id: created.id,
    source: "github",
    event: `Workflow "${run.workflow_name}" failed`,
    provenance: {
      workflowRunId: run.github_run_id,
      workflowName: run.workflow_name,
      branch: run.branch,
      commit: run.commit_sha,
      actor: run.actor,
      htmlUrl: run.html_url,
      failedJobs: jobs?.map((j) => ({
        name: j.name,
        id: j.github_job_id,
      })),
      failedSteps: failedSteps.map((step) => ({
        name: step.step_name,
        number: step.step_number,
      })),
      logPath: log?.storage_path ?? null,
    },
  });
}

/**
 * Step 9: Resolve logic
 * When a run is successful, find any open "Workflow Failed" incidents
 * for that specific workflow and branch, then close them.
 */
async function resolveWorkflowIncident(run: any) {
  // Find the active incident for this specific workflow and branch
  const { data: incident } = await supabaseAdmin
    .from("incidents")
    .select("id")
    .eq("team_id", run.team_id)
    .eq("title", "Workflow Failed")
    .eq("status", "Active")
    .ilike("summary", `%${run.workflow_name}%`)
    .ilike("summary", `%${run.branch}%`)
    .maybeSingle();

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
      source: "github",
      event: `Workflow "${run.workflow_name}" resolved on branch ${run.branch}`,
      provenance: {
        resolvedByRunId: run.github_run_id,
        commit: run.commit_sha
      }
    });
  }
}