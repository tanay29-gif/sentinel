import { supabaseAdmin } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { HandlePullRequestPayload } from "@/lib/interface";


export default async function handlePullRequest(payload: HandlePullRequestPayload) {
  const { pull_request, action, repository } = payload;

  // 1. Get internal IDs
  const { data: repoRecord } = await supabaseAdmin
    .from("repositories")
    .select("id, team_id")
    .eq("full_name", repository.full_name)
    .single();

  if (!repoRecord){ 
    return NextResponse.json({ success: false, message: "Repository not found" });
  }

  // console.log("repository fetched", repoRecord);

    // 3. Log the event for the Dashboard timeline
  const details = getPullRequestEventMessage(
    action, 
    pull_request.number, 
    pull_request.user.login
  );

  // 2. Upsert the Pull Request table (The table in your screenshot)
  const { data: prRecord, error: prError } = await supabaseAdmin
    .from("pull_requests")
    .upsert({
      github_pr_id: pull_request.id,
      repository_id: repoRecord.id,
      team_id: repoRecord.team_id,
      number: pull_request.number,
      title: pull_request.title,
      author: pull_request.user.login,
      source_branch: pull_request.head.ref,
      target_branch: pull_request.base.ref,
      state: pull_request.state,
      merged: pull_request.merged,
      created_at: pull_request.created_at,
      merged_at: pull_request.merged_at,
      last_event_message: details.title 
      // html_url is in the payload but not your interface, add if needed
    }, { onConflict: "github_pr_id" })
    .select("id")
    .single();

  if (prError || !prRecord) return;

  // console.log("row created inthe workflowRun", prRecord.id);


  await supabaseAdmin.from("workflow_events").insert({
    // We link it to the PR if you have a pr_id column in events, 
    // or just keep it associated with repo/team
    repository_id: repoRecord.id,
    team_id: repoRecord.team_id,
    event_type: `pr_${action}`,
    level: details.level,
    title: details.title,
    description: details.description,
  });


  if (prError) throw prError;

  // console.log("workflow events created ");

  return NextResponse.json({
    success: true,
    message: "Pull request processed",
  });
}

export function getPullRequestEventMessage(
  action: string,
  prNumber: number,
  author: string
) {
  switch (action) {
    case "opened":
      return {
        level: "INFO",
        title: `PR #${prNumber} Opened`,
        description: `Pull Request #${prNumber} was created by ${author}.`,
      };
    case "synchronize":
      return {
        level: "INFO",
        title: `PR #${prNumber} Updated`,
        description: `${author} pushed new commits to PR #${prNumber}.`,
      };
    case "closed":
      return {
        level: "SUCCESS", // Or INFO
        title: `PR #${prNumber} Closed`,
        description: `Pull Request #${prNumber} was closed.`,
      };
    case "reopened":
      return {
        level: "INFO",
        title: `PR #${prNumber} Reopened`,
        description: `Pull Request #${prNumber} is back in review.`,
      };
    default:
      return {
        level: "INFO",
        title: `PR #${prNumber} Activity`,
        description: `Action: ${action} by ${author}`,
      };
  }
}