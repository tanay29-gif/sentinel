import { createClient } from "./server";

interface GitHubCommit {
  id: string;
  repo: string;
  branch: string;
  commit: string;
  message: string;
  author: string;
  time: string;
  url?: string;
}

interface GitHubBranch {
  name: string;
  repo: string;
  lastCommit?: string;
}

interface GitHubRepositoryResponse {
  full_name: string;
}

interface GitHubCommitResponse {
  sha: string;
  html_url?: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

interface GitHubBranchResponse {
  name: string;
  commit: {
    sha: string;
  };
}

export async function getGitHubClient() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();

   if (error || !session?.user) {
    throw new Error("User not authenticated");
  }

 return {
    user: session.user,
    token: session.provider_token, // This is the GitHub token from Supabase
    supabase, // returning the client in case you need it
  };
}

export async function fetchUserRepositories(): Promise<string[]> {
  const { token } = await getGitHubClient();

  if (!token) {
      console.error("No GitHub provider token found. Check Supabase Auth scopes.");
      return [];
    }

  
  try {
    const response = await fetch(`https://api.github.com/user/repos`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.error("GitHub API error:", response.status);
      return [];
    }

    const repos = (await response.json()) as GitHubRepositoryResponse[];
    return repos.map((repo) => repo.full_name);
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return [];
  }
}

export async function fetchRecentCommits(repos?: string[]): Promise<GitHubCommit[]> {
  const { token } = await getGitHubClient();
  const reposToFetch = repos || (await fetchUserRepositories());

    if (!token) {
      console.error("No GitHub provider token found. Check Supabase Auth scopes.");
      return [];
    }

  const commits: GitHubCommit[] = [];

  for (const repo of reposToFetch) {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/commits`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        console.warn(`Could not fetch commits for ${repo}`);
        continue;
      }

      const commitData = (await response.json()) as GitHubCommitResponse[];
      
      const recentCommits = commitData.slice(0, 5).map((commit) => ({
        id: commit.sha.substring(0, 7),
        repo: repo,
        branch: "main", // Default branch, can be enhanced
        commit: commit.sha.substring(0, 7),
        message: commit.commit.message.split("\n")[0],
        author: commit.commit.author.name,
        time: formatTime(new Date(commit.commit.author.date)),
        url: commit.html_url,
      }));

      commits.push(...recentCommits);
    } catch (error) {
      console.error(`Error fetching commits for ${repo}:`, error);
    }
  }

  // Sort by time (newest first)
  return commits.sort((a, b) => {
    const timeA = parseTime(a.time);
    const timeB = parseTime(b.time);
    return timeB - timeA;
  });
}

export async function fetchBranches(repo: string): Promise<GitHubBranch[]> {
  const { token } = await getGitHubClient();

  if (!token) {
      console.error("No GitHub provider token found. Check Supabase Auth scopes.");
      return [];
    }
  
  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/branches`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.warn(`Could not fetch branches for ${repo}`);
      return [];
    }

    const branchData = (await response.json()) as GitHubBranchResponse[];
    return branchData.map((branch) => ({
      name: branch.name,
      repo: repo,
      lastCommit: branch.commit.sha.substring(0, 7),
    }));
  } catch (error) {
    console.error(`Error fetching branches for ${repo}:`, error);
    return [];
  }
}

function formatTime(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  
  return date.toLocaleDateString();
}

function parseTime(timeStr: string): number {
  const now = Date.now();
  
  if (timeStr === "just now") return now;
  
  const match = timeStr.match(/(\d+)([mhd])\s+ago/);
  if (!match) return 0;
  
  const [, value, unit] = match;
  const num = parseInt(value);
  
  switch (unit) {
    case "m":
      return now - num * 60 * 1000;
    case "h":
      return now - num * 3600 * 1000;
    case "d":
      return now - num * 86400 * 1000;
    default:
      return 0;
  }
}
