import type { LucideIcon } from 'lucide-react';

// GitHubCommit, GitHubBranch, GitHubRepositoryResponse, GitHubCommitResponse, GitHubBranchResponse

// handleworkflowRun
// {
//   "action":"completed",
//   "workflow_run":{

//       "id":123,

//       "name":"CI",

//       "status":"completed",

//       "conclusion":"success",

//       "head_branch":"main",

//       "head_sha":"abc123",

//       "event":"push",

//       "actor":{
//          "login":"Tanay"
//       }
//   }
// }

// Incident Engine
export interface IncidentInput {
    source:
        | "health"
        | "grafana"
        | "deployment_status"
        | "workflow_run"
        | "workflow_job"
        | "push"
        | "pull_request";

    serviceId: string;

    timestamp: Date;

    payload: any;
}


export interface handleWorkflowRunPayload {
  action: string;
  repository: any;
  workflow_run: {
    id: number;
    name: string;
    status: string;
    conclusion: string;
    head_branch: string;
    head_sha: string;
    event: string;
    actor: {
      login: string;
    };
    run_started_at: string;
    updated_at: string;
    html_url: string;
    run_attempt: number;
    run_number: number;
  };
}

export interface WorkflowRunRecord {
  id: string; // or number, depending on your DB (use string for UUID)
}

export interface HandleWorkflowJobPayload {
  action: "queued" | "in_progress" | "completed";

  workflow_job: {
    id: number;
    run_id: number;

    name: string;

    status: "queued" | "in_progress" | "completed";

    conclusion: "success" | "failure" | "cancelled" | null;

    started_at: string | null;
    completed_at: string | null;
  };

  repository: {
    full_name: string;

    owner: {
      login: string;
    };

    name: string;
  };
}

export interface HandlePullRequestPayload {
  action: "opened" | "closed" | "reopened" | "synchronize";

  pull_request: {
    id: number;

    number: number;

    title: string;

    state: "open" | "closed";

    merged: boolean;

    created_at: string;

    merged_at: string | null;

    head: {
      ref: string;
    };

    base: {
      ref: string;
    };

    user: {
      login: string;
    };
  };

  repository: {
    full_name: string;
  };
}

export interface HandlePushPayload {
  ref: string;
  before: string;
  after: string;
  compare: string;
  pusher: {
    name: string;
    login: string;
  };
  commits: any[]; // Used for .length
  head_commit: {
    message: string;
  } | null;
  repository: {
    full_name: string;
    pushed_at: number; // Unix timestamp
  };
}


export interface Commit {
  id: string;
  repo: string;
  branch: string;
  commit: string;
  message: string;
  author: string;
  time: string;
  url?: string;
}




export interface AppShellProps {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>; // Define the prop here
}
export interface PageHeaderProps {
  title: string;
  eyebrow: string;
  action?: React.ReactNode; // Ensure this is ReactNode
}

export interface Service {
    id: string;
    name: string;
    base_url: string;
}

export interface ServiceListProps {
    ServicesNames: Service[];
    allMetrics: Record<string, ServiceMetrics>; // Initial 14-day data from Server
}

export interface DailyHistory {
  timestamp: number;
  status: ServiceState;
}

export type ServiceState =
  | "no-data"
  | "operational"
  | "warning"
  | "critical"
  | "offline";

export interface ServiceMetrics {
  uptimePercentage: number;
  dailyHistory: { timestamp: number; status: ServiceState }[];
  lastLatency: number;
  lastErrorRate: string;
  requestRate: number;
  currentStatus: ServiceState;
}


export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}


export interface refreshWorkflowLogs {
  // supabase: SupabaseClient,
  teamId: string,
  installationId: string,
  owner: string,
  repo: string,
  repositoryFullName: string
}

// github-sync
export interface GitHubRepository  {
  id: number;
  name: string;
  full_name: string;
  html_url: string | null;
  default_branch: string | null;
  owner: { login: string };
};

export interface GitHubBranch  {
  name: string;
  commit: { sha: string };
};

export interface GitHubCommit  {
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

export interface GithubDeployment {
  id: number;
  sha: string;
  ref: string;
  environment: string;
  statuses_url: string;
}
export interface WorkflowRun {
  id: number;
  name: string | null;
  display_title: string;
  head_sha: string;
  status: string | null;
  conclusion: string | null;
  html_url: string;
  event: string;
  created_at: string;
};

export interface InstalledRepository  {
  name: string;
  full_name: string;
  html_url: string | null;
  default_branch: string | null;
};