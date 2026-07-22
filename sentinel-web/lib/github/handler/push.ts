import {supabaseAdmin} from "@/lib/supabase/service";
import { HandlePushPayload } from "@/lib/interface";
import { NextResponse } from "next/server";

export default async function handlePush(payload: HandlePushPayload) {
  const { ref, before, after, pusher, commits, head_commit, repository } = payload;


  // 1. Get internal Repo & Team IDs
  const { data: repoRecord } = await supabaseAdmin
    .from("repositories")
    .select("id, team_id")
    .eq("full_name", repository.full_name)
    .single();

  if (!repoRecord) return;

  const branchName = ref.replace("refs/heads/", "");

  // 3. Insert into Supabase
  const { error: pushTableError } = await supabaseAdmin
    .from("pushes")
    .insert({
      repository_id: repoRecord.id,
      team_id: repoRecord.team_id,
      
      branch: branchName,
      before_sha: before,
      after_sha: after,
      
      pusher: pusher.name || pusher.login, // GitHub sends pusher name or login
      
      commit_count: commits?.length || 0,
      head_commit_message: head_commit?.message || "No message",
      compare_url: payload.compare,
      
      // Convert pushed_at (Unix timestamp or ISO) to ISO string
      pushed_at: new Date(repository.pushed_at * 1000).toISOString(),
    });

  if (pushTableError) {
    console.error("Push Table Error:", pushTableError);
    return NextResponse.json({ success: false, error: pushTableError.message });
  }

  
  // 2. Generate the message details
  const details = getPushEventMessage(payload);

  // 3. Insert into workflow_events
  // Note: workflow_run_id is NULL here because the push happens BEFORE the run starts.
  // This is how you show the "Push" happened before the "Workflow Started".
  const { error } = await supabaseAdmin.from("workflow_events").insert({
    repository_id: repoRecord.id,
    team_id: repoRecord.team_id,
    event_type: "push",
    level: details.level,
    title: details.title,
    description: details.description,
  });

  if (error) console.error("Error logging push event:", error);
}

export function getPushEventMessage(payload: HandlePushPayload) {
  const branchName = payload.ref.replace("refs/heads/", "");
  const commitCount = payload.commits.length;
  const pusherName = payload.pusher.name;

  return {
    level: "INFO",
    title: `${pusherName} pushed ${commitCount} commit${commitCount === 1 ? "" : "s"}`,
    description: `${branchName} branch updated.`,
    eventType: "push"
  };
}