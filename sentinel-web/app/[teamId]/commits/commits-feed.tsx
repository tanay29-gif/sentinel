"use client";

import { useEffect, useState } from "react";
import { GitCommit, GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Commit {
  id: string;
  repo: string;
  branch: string;
  commit: string;
  message: string;
  author: string;
  time: string;
  url?: string;
}

export function CommitsFeed() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCommits() {
      try {
        setLoading(true);
        const response = await fetch("/api/commits");
        if (!response.ok) {
          throw new Error("Failed to fetch commits");
        }
        const data = await response.json();
        setCommits(data.commits || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        console.error("Error fetching commits:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCommits();
  }, []);

  if (loading) {
    return (
      <Card className="rounded-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Commits</CardTitle>
          <Badge variant="outline" className="gap-1">
            <GitBranch className="size-3" />
            Branches
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-500">Loading commits...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="rounded-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Commits</CardTitle>
          <Badge variant="outline" className="gap-1">
            <GitBranch className="size-3" />
            Branches
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-red-500">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  if (commits.length === 0) {
    return (
      <Card className="rounded-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Commits</CardTitle>
          <Badge variant="outline" className="gap-1">
            <GitBranch className="size-3" />
            Branches
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-slate-500">No commits found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Commits</CardTitle>
        <Badge variant="outline" className="gap-1">
          <GitBranch className="size-3" />
          Branches
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {commits.map((commit) => (
          <div
            key={commit.id}
            className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[1fr_120px_110px_90px] md:items-center"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{commit.message}</p>
              <p className="truncate text-sm text-slate-500">
                {commit.repo} &bull; {commit.author} &bull; {commit.time}
              </p>
            </div>
            <Badge variant="secondary" className="justify-center">
              <GitBranch className="mr-1 size-3" /> {commit.branch}
            </Badge>
            <span className="font-mono text-sm text-slate-500">{commit.commit}</span>
            <Button variant="outline" size="sm" asChild>
              <a href={commit.url || "#"} target="_blank" rel="noopener noreferrer">
                <GitCommit className="size-4" />
                Diff
              </a>
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
