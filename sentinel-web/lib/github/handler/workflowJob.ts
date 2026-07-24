import { supabaseAdmin } from "@/lib/supabase/service";
import { HandleWorkflowJobPayload } from "@/lib/interface";
import { NextResponse } from "next/server";




export default async function handleWorkflowJob(payload: HandleWorkflowJobPayload){
const { workflow_job, repository } = payload;

  // 1. Get your internal Repository & Team UUIDs first
  const { data: repoRecord } = await supabaseAdmin
    .from("repositories")
    .select("id, team_id")
    .eq("full_name", repository.full_name)
    .single();

  if (!repoRecord) {
    return NextResponse.json({ success: false, error: "Repository not found"}); 
  }


  const { data: runRecord, error: runError } = await supabaseAdmin
    .from("workflow_runs")
    .upsert({
      github_run_id: workflow_job.run_id, // Match the parent ID
      repository_id: repoRecord.id,
      team_id: repoRecord.team_id,
      status: workflow_job.status,       // Placeholder until full run payload arrives
      provider: "github"
    }, { onConflict: "github_run_id" })
    .select("id")
    .single();

  if (runError || !runRecord) {
    console.error("Workflow Run Table Error:", runError);
    return NextResponse.json({ success: false, error: runError.message });
  }

  // 3. Now it is 100% SAFE to insert the Event
  const eventType = determineEventType(payload);
  const details = getWorkflowEventMessage(eventType, workflow_job.name);

  const {data: eventsData, error: eventsError} =await supabaseAdmin.from("workflow_events").insert({
    workflow_run_id: runRecord.id, // This UUID is now guaranteed to exist
    workflow_job_id: workflow_job.id,
    repository_id: repoRecord.id,
    status: workflow_job.status,
    team_id: repoRecord.team_id,
    event_type: eventType,
    level: details.level,
    title: details.title,
    description: details.description,
  })
  .select("id")
  .single();

  if(eventsError || !eventsData){
    console.error("Workflow Events Table Error:", eventsError);
    return NextResponse.json({ success: false, error: eventsError.message })
  }

  console.log("workflow_events table created", eventsData?.id );
 
  console.log("workflow_job worked");
  return NextResponse.json({ success: true, error: "Workflow_job worked perfect" })
}

function determineEventType(payload: HandleWorkflowJobPayload): string {
  const { action, workflow_job } = payload;

  if (action === "queued") {
    return "job_queued";
  }

  if (action === "in_progress") {
    return "job_started";
  }

  if (action === "completed") {
    switch (workflow_job.conclusion) {
      case "success":
        return "job_completed";
      case "failure":
        return "job_failed";
      case "cancelled":
        return "job_cancelled";
      default:
        return "job_completed";
    }
  }

  return "unknown";
}

export function getWorkflowEventMessage(
  eventType: string,
  name?: string // This will be payload.workflow_job.name (e.g., "Build" or "Test")
) {
  switch (eventType) {
    case "job_queued":
      return {
        level: "INFO",
        title: `${name} Queued`,
        description: `${name} is waiting in the queue.`,
      };

    case "job_started":
      return {
        level: "INFO",
        title: `${name} Started`,
        description: `${name} has started.`,
      };

    case "job_completed":
      return {
        level: "SUCCESS", // Changed to SUCCESS for better UI coloring
        title: `${name} Completed`,
        description: `${name} completed successfully.`,
      };

    case "job_failed":
      return {
        level: "ERROR",
        title: `${name} Failed`,
        description: `${name} failed. Check logs for details.`,
      };

    case "job_cancelled":
      return {
        level: "WARNING",
        title: `${name} Cancelled`,
        description: `${name} was manually cancelled.`,
      };

    // ... keep your workflow and deployment cases below ...
    default:
      return {
        level: "INFO",
        title: name || "Workflow Update",
        description: "Processing...",
      };
  }
}