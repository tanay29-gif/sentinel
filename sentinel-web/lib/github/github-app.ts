// lib/github-app.ts
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import type {WorkflowRun} from "@/lib/interface";

export async function getInstallationClient(installationId: string) {
     const appId = process.env.NEXT_PUBLIC_GITHUB_APP_ID;
  const privateKey = process.env.NEXT_PUBLIC_GITHUB_PRIVATE_KEY;

   if (!appId || !privateKey) {
    throw new Error(
      "Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY in environment variables."
    );
  }
  const formattedKey = privateKey.replace(/\\n/g, '\n').trim();

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: appId,
      privateKey: formattedKey,
      installationId: installationId,
    },
  });

  
}

export async function refreshWorkflowLogs(
  supabase: SupabaseClient,
  teamId: string,
  installationId: string,
  owner: string,
  repo: string,
  repositoryFullName: string
) {
  const octokit = await getInstallationClient(installationId);

  const { data: runsData } = await octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs",
    {
      owner,
      repo,
      per_page: 10,
    }
  );

  const runs = runsData.workflow_runs as WorkflowRun[];

  // Remove previous logs for this repository
  await supabase
    .from("logs")
    .delete()
    .eq("team_id", teamId)
    .eq("metadata->>repo", repositoryFullName);

  for (const run of runs) {
    const isFailure = run.conclusion === "failure";
    const level =
      isFailure || run.conclusion === "cancelled"
        ? "ERROR"
        : "INFO";

    let failureSummary: {
      job: string;
      failed_steps: string[];
    }[] = [];

    if (isFailure) {
      try {
        const { data: jobsData } = await octokit.request(
          "GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs",
          {
            owner,
            repo,
            run_id: run.id,
          }
        );

        failureSummary = jobsData.jobs
          .filter(job => job.conclusion === "failure")
          .map(job => ({
            job: job.name,
            failed_steps:
              job.steps
                ?.filter(step => step.conclusion === "failure")
                .map(step => step.name) ?? [],
          }));
      } catch (e) {
        console.warn("Couldn't fetch jobs", run.id);
      }
    }

    await supabase.from("logs").insert({
      team_id: teamId,
      run_id: String(run.id),
      level,
      message: `${repositoryFullName}: ${run.display_title} is ${
        run.conclusion ?? run.status
      }`,
      metadata: {
        repo: repositoryFullName,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        sha: run.head_sha,
        failures: failureSummary.length ? failureSummary : null,
      },
      created_at: run.created_at,
    });
  }
}

export async function fetchRepositories(installationId: string) {
  const octokit = await getInstallationClient(installationId);
  // This endpoint gets repos specific to the installation
  const { data } = await octokit.request("GET /installation/repositories");
  return data.repositories;
}