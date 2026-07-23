import { supabaseAdmin } from "@/lib/supabase/service";
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

    if (!repoRecord) {
    console.log("Webhook received for untracked repository:", repository.full_name);
    return NextResponse.json({ 
        success: false, 
        message: "Repository not found in database" 
    }, { status: 200 }); // We use 200 so GitHub stops retrying
  }


  console.log("repository fetched", repoRecord.team_id);

  const branchName = ref.replace("refs/heads/", "");

  // 3. Insert into Supabase
  const { data: pushData, error: pushTableError } = await supabaseAdmin
    .from("push_events")
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
    })
    .select("id") // We need this ID for the commits table
    .single();
  ;

  console.log("push_evnts table created", pushData?.id );

  if (pushTableError || !pushData) {
    console.error("Push Table Error:", pushTableError);
    return NextResponse.json({ success: false, error: pushTableError.message });
  }

  // 3. Insert individual commits into the "commits" table
  if (commits && commits.length > 0) {
    const commitsToInsert = commits.map((commit) => ({
      push_id: pushData.id, // Linking to the push we just created
      repository_id: repoRecord.id,
      sha: commit.id,
      message: commit.message,
      author_name: commit.author.name,
      url: commit.url,
      committed_at: commit.timestamp, 
    }));

    const {error:commitsError} = await supabaseAdmin
    .from("commits")
    .upsert({commitsToInsert}, { onConflict: "sha" });

    if(commitsError){
      console.error("Commits Table Error:", commitsError);
      return NextResponse.json({ success: false, error: commitsError.message });
    }


     console.log("commits created and worked")
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

  return NextResponse.json({ success: true, message: "Push processed"});
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