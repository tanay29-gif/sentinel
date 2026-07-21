import type { LucideIcon } from 'lucide-react';


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

export interface Service {
    id: string;
    name: string;
}

export interface ServiceListProps {
    ServicesNames: Service[];
    allMetrics: Record<string, ServiceMetrics>; // Initial 14-day data from Server
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

export interface DailyHistory {
  timestamp: number;
  status: "operational" | "warning" | "critical";
}

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface GitHubCommit {
  id: string;
  repo: string;
  branch: string;
  commit: string;
  message: string;
  author: string;
  time: string;
  url?: string;
}

export interface GitHubBranch {
  name: string;
  repo: string;
  lastCommit?: string;
}

export interface GitHubRepositoryResponse {
  full_name: string;
}

export interface GitHubCommitResponse {
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

export interface GitHubBranchResponse {
  name: string;
  commit: {
    sha: string;
  };
}

export interface ServiceMetrics {
  uptimePercentage: number;
  dailyHistory: { timestamp: number; status: string }[];
  lastLatency: number;
  lastErrorRate: string;
  currentStatus: string;
}