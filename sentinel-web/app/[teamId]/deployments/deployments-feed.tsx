"use client";

import { useEffect, useMemo, useState } from "react";
import { GitCommit, Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

type Deployment = {
  id: string;
  repo_full_name: string;
  commit_sha: string;
  commit_message: string | null;
  author_handle: string | null;
  environment: string;
  status: string;
  deployed_at: string;
};

function formatTime(value: string) {
  const date = new Date(value);
  const seconds = Math.max(0, Math.round((Date.now() - date.getTime()) / 1000));

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.round(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  return date.toLocaleDateString();
}

function statusVariant(status: string) {
  if (status === "failure") {
    return "destructive" as const;
  }

  if (status === "success") {
    return "secondary" as const;
  }

  return "outline" as const;
}

export function DeploymentsFeed() {
  const supabase = useMemo(() => createClient(), []);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadDeployments() {
      const { data } = await supabase
        .from("deployments")
        .select("id,repo_full_name,commit_sha,commit_message,author_handle,environment,status,deployed_at")
        .order("deployed_at", { ascending: false })
        .limit(30);

      if (isMounted) {
        setDeployments((data ?? []) as Deployment[]);
        setIsLoading(false);
      }
    }

    void loadDeployments();

    const channel = supabase
      .channel("deployments-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deployments" },
        (payload) => {
          const next = payload.new as Deployment | null;

          if (!next?.id) {
            return;
          }

          setDeployments((current) => {
            const withoutUpdated = current.filter((deployment) => deployment.id !== next.id);
            return [next, ...withoutUpdated]
              .sort((a, b) => new Date(b.deployed_at).getTime() - new Date(a.deployed_at).getTime())
              .slice(0, 30);
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <Card className="rounded-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Deployment Feed</CardTitle>
        <Badge variant="outline" className="gap-1">
          <Radio className="size-3" />
          Live
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Loading deployments...
          </div>
        ) : deployments.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            Waiting for GitHub Actions build events.
          </div>
        ) : (
          deployments.map((deployment) => (
            <div
              key={deployment.id}
              className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[90px_1fr_110px_110px_90px] md:items-center"
            >
              <span className="font-mono text-sm text-slate-500">{deployment.id.slice(0, 8)}</span>
              <div className="min-w-0">
                <p className="truncate font-medium">{deployment.repo_full_name}</p>
                <p className="truncate text-sm text-slate-500">
                  Commit {deployment.commit_sha.slice(0, 7)}
                  {deployment.author_handle ? ` by ${deployment.author_handle}` : ""} /{" "}
                  {formatTime(deployment.deployed_at)}
                </p>
              </div>
              <Badge variant="outline">{deployment.environment}</Badge>
              <Badge variant={statusVariant(deployment.status)}>{deployment.status}</Badge>
              <Button variant="outline" size="sm">
                <GitCommit className="size-4" />
                Logs
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
