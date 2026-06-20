import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { getInstallationClient } from "@/lib/github-app";

type GitHubRepository = {
  name: string;
  full_name: string;
  html_url: string | null;
  default_branch: string | null;
  owner: { login: string };
};

type GitHubBranch = {
  name: string;
  commit: { sha: string };
};

type GitHubCommit = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string | null;
      date: string | null;
    } | null;
  };
  author: {
    login: string;
    avatar_url: string;
  } | null;
};

type WorkflowRun = {
  id: number;
  name: string | null;
  display_title: string;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  created_at: string;
};

export type InstalledRepository = {
  name: string;
  full_name: string;
  html_url: string | null;
  default_branch: string | null;
};

export function getWriteClient(userClient: SupabaseClient) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return userClient;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function fetchInstalledRepositories(installationId: string): Promise<InstalledRepository[]> {
  const octokit = await getInstallationClient(installationId);
  const { data } = await octokit.request("GET /installation/repositories");
  const repositories = data.repositories as GitHubRepository[];

  return repositories.map((repository) => ({
    name: repository.name,
    full_name: repository.full_name,
    html_url: repository.html_url,
    default_branch: repository.default_branch,
  }));
}

export async function syncInstallationData(
  supabase: SupabaseClient,
  teamId: string,
  installationId: string,
  selectedRepoFullName?: string
) {
  const octokit = await getInstallationClient(installationId);
  const { data } = await octokit.request("GET /installation/repositories");
  const repositories = (data.repositories as GitHubRepository[]).filter((repository) =>
    selectedRepoFullName ? repository.full_name === selectedRepoFullName : true
  );

  for (const repository of repositories) {
    const { data: repoRow, error: repoError } = await supabase
      .from("repositories")
      .upsert(
        {
          team_id: teamId,
          name: repository.name,
          full_name: repository.full_name,
          provider: "github",
          html_url: repository.html_url,
          default_branch: repository.default_branch ?? "main",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "full_name" }
      )
      .select("id, default_branch")
      .single();

    if (repoError || !repoRow) {
      console.error("Repository sync failed:", repository.full_name, repoError);
      continue;
    }

    const owner = repository.owner.login;
    const repo = repository.name;
    const { data: branchData } = await octokit.request("GET /repos/{owner}/{repo}/branches", {
      owner,
      repo,
      per_page: 100,
    });
    const branches = branchData as GitHubBranch[];

    for (const branch of branches) {
      await supabase.from("branches").upsert(
        {
          repository_id: repoRow.id,
          name: branch.name,
          is_default: branch.name === repoRow.default_branch,
        },
        { onConflict: "repository_id,name" }
      );
    }

    const { data: defaultBranch } = await supabase
      .from("branches")
      .select("id")
      .eq("repository_id", repoRow.id)
      .eq("name", repoRow.default_branch)
      .maybeSingle();

    const { data: commitData } = await octokit.request("GET /repos/{owner}/{repo}/commits", {
      owner,
      repo,
      sha: repoRow.default_branch,
      per_page: 5,
    });
    const commits = commitData as GitHubCommit[];

    for (const commit of commits) {
      await supabase.from("commits").upsert(
        {
          repository_id: repoRow.id,
          branch_id: defaultBranch?.id ?? null,
          sha: commit.sha,
          message: commit.commit.message.split("\n")[0] || "Commit",
          author_handle: commit.author?.login ?? commit.commit.author?.name ?? null,
          author_avatar_url: commit.author?.avatar_url ?? null,
          committed_at: commit.commit.author?.date ?? new Date().toISOString(),
        },
        { onConflict: "sha" }
      );
    }

    try {
      const { data: runsData } = await octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
        owner,
        repo,
        per_page: 5,
      });
      const runs = runsData.workflow_runs as WorkflowRun[];

      for (const run of runs) {
        const level = run.conclusion === "failure" || run.conclusion === "cancelled" ? "ERROR" : "INFO";
        const runId = String(run.id);
        const { data: existingLog } = await supabase
          .from("logs")
          .select("id")
          .eq("team_id", teamId)
          .eq("run_id", runId)
          .maybeSingle();

        if (!existingLog) {
          await supabase.from("logs").insert({
            team_id: teamId,
            run_id: runId,
            job_name: run.name ?? "GitHub Actions",
            level,
            message: `${repository.full_name}: ${run.display_title} is ${run.conclusion ?? run.status ?? "queued"}`,
            metadata: {
              repo: repository.full_name,
              status: run.status,
              conclusion: run.conclusion,
              url: run.html_url,
            },
            created_at: run.created_at,
          });
        }
      }
    } catch (error) {
      console.warn("Workflow run sync skipped:", repository.full_name, error);
    }
  }
}
