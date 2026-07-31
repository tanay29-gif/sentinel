"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, GitBranch, GitCommit, GitMerge, GitPullRequestArrow, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/sentinel/metric-card";
import type { Commit } from "@/lib/interface";
import { createClient } from "@/lib/supabase/client";


type ActivityItem = {
  id: string;
  time: string;
  actor: string;
  title: string;
  detail: string;
  type: "push" | "pr-open" | "pr-merged" | "commit";
  tone: "emerald" | "amber" | "slate" | "red";
};
// id: `pr-${pr.id}`,
// time: formatTime(pr.updated_at || pr.created_at),
// actor: pr.author,
// title: `PR #${pr.number} ${pr.state}`,
// detail: pr.title,
// type: pr.merged || pr.state === 'merged' ? "pr-merged" : "pr-open",
// tone: pr.merged || pr.state === 'merged' ? "slate" : "amber"

// const fallbackCommits: Commit[] = [
//   {
//     id: "c1",
//     repo: "sentinel-web",
//     branch: "main",
//     commit: "4f9d2ab",
//     message: "Improve release health cards and incident context",
//     author: "Tanay",
//     time: "12:30",
//     url: "#",
//   },
//   {
//     id: "c2",
//     repo: "sentinel-api",
//     branch: "main",
//     commit: "9b1e2cf",
//     message: "Add workflow log normalization for CI insights",
//     author: "Rahul",
//     time: "11:48",
//     url: "#",
//   },
//   {
//     id: "c3",
//     repo: "sentinel-web",
//     branch: "release/1.2",
//     commit: "1dce883",
//     message: "Tune dashboard layout for observability ops",
//     author: "Asha",
//     time: "10:22",
//     url: "#",
//   },
// ];

// const fallbackActivity: ActivityItem[] = [
//   {
//     id: "a1",
//     time: "12:30",
//     actor: "Tanay",
//     title: "Pushed 3 commits to main",
//     detail: "sentinel-web · 3 new changes shipped to production readiness",
//     type: "push",
//     tone: "emerald",
//   },
//   {
//     id: "a2",
//     time: "12:20",
//     actor: "Ops",
//     title: "PR #45 opened for rollout validation",
//     detail: "Waiting on review before deployment confidence is raised",
//     type: "pr-open",
//     tone: "amber",
//   },
//   {
//     id: "a3",
//     time: "12:15",
//     actor: "Rahul",
//     title: "PR #44 merged into main",
//     detail: "Incident triage improvements are now live in the branch",
//     type: "pr-merged",
//     tone: "slate",
//   },
//   {
//     id: "a4",
//     time: "12:00",
//     actor: "Asha",
//     title: "Committed a metrics polish pass",
//     detail: "Improved telemetry cards and reduced noise for deployment checks",
//     type: "commit",
//     tone: "red",
//   },
// ];

type CommitsFeedProps = {
  teamId: string;
};

// type Commit = {
//   id: string;
//   repo: string;
//   branch: string | null;
//   commit: string | undefined;
//   message: string | null;
//   author: string | null;
//   time: string;
//   url: string | null;
// };

export function CommitsFeed({ teamId }: CommitsFeedProps) {

  const supabase = createClient();

  const [commits, setCommits] = useState<Commit[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState({
    commitsToday: 0,
    openPRs: 0,
    mergedPRs: 0,
    topContributor: "N/A"
  });
  const [loading, setLoading] = useState(true);

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const loadData = async () => {
    // 1. Fetch Summary Stats
    const { data: pushData } = await supabase
      .from("push_events")
      .select("commit_count, pusher, pushed_at")
      .eq("team_id", teamId);

    const { data: prData } = await supabase
      .from("pull_requests")
      .select("state, merged")
      .eq("team_id", teamId);


    console.log("pushData", pushData);
    console.log("prData", prData);

    // Calculate Summary
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const commitsToday = pushData?.filter(p => new Date(p.pushed_at) >= today)
      .reduce((acc, curr) => acc + (curr.commit_count || 1), 0) || 0;

    const openPRs = prData?.filter(pr => pr.state === 'open').length || 0;
    const mergedPRs = prData?.filter(pr => pr.merged || pr.state === 'merged').length || 0;

    // Find Top Contributor
    const counts = pushData?.reduce((acc: any, curr) => {
      acc[curr.pusher] = (acc[curr.pusher] || 0) + 1;
      return acc;
    }, {});
    const topContributor = counts ? Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b) : "N/A";

    setSummary({ commitsToday, openPRs, mergedPRs, topContributor });

    // 2. Fetch Lists
    const { data: latestPushes } = await supabase
      .from("push_events")
      .select("*")
      .eq("team_id", teamId)
      .order("pushed_at", { ascending: false })
      .limit(6);

    const { data: latestPRs } = await supabase
      .from("pull_requests")
      .select("*")
      .eq("team_id", teamId)
      .order("updated_at", { ascending: false })
      .limit(5);

    setCommits((latestPushes || []).map(p => ({
      id: p.id,
      repo: "Main Repo",
      branch: p.branch,
      commit: p.after_sha?.substring(0, 7),
      message: p.head_commit_message,
      author: p.pusher,
      time: formatTime(p.pushed_at),
      url: p.compare_url
    })));

    const pushAct: ActivityItem[] = (latestPushes || []).map(p => ({
      id: `push-${p.id}`,
      time: formatTime(p.pushed_at),
      actor: p.pusher,
      title: `Pushed ${p.commit_count} commits to ${p.branch}`,
      detail: p.head_commit_message,
      type: "push",
      tone: "emerald"
    }));

    const prAct: ActivityItem[] = (latestPRs || []).map(pr => ({
      id: `pr-${pr.id}`,
      time: formatTime(pr.updated_at || pr.created_at),
      actor: pr.author,
      title: `PR #${pr.number} ${pr.state}`,
      detail: pr.title,
      type: pr.merged || pr.state === 'merged' ? "pr-merged" : "pr-open",
      tone: pr.merged || pr.state === 'merged' ? "slate" : "amber"
    }));

    setActivity([...pushAct, ...prAct].sort((a, b) => b.time.localeCompare(a.time)).slice(0, 8));
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel(`dashboard-pulse-${teamId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "push_events",
          filter: `team_id=eq.${teamId}`,
        },
        () => loadData()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pull_requests",
          filter: `team_id=eq.${teamId}`,
        },
        () => loadData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Commits today" value={String(summary.commitsToday)} detail="Rolling 24h delivery signal" icon={GitCommit} tone="emerald" />
        <MetricCard title="Open PRs" value={String(summary.openPRs)} detail="Awaiting review and merge" icon={GitPullRequestArrow} tone="amber" />
        <MetricCard title="Merged PRs" value={String(summary.mergedPRs)} detail="Completed in the current sprint" icon={GitMerge} tone="slate" />
        <MetricCard title="Top contributor" value={summary.topContributor} detail="Most active in the last cycle" icon={Users} tone="red" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Latest activity</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Activity className="size-3" />
              Delivery pulse
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading delivery activity...</p>
            ) : activity.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 p-6 text-center">
                <p className="font-medium text-slate-700">No activities found</p>
                <p className="mt-1 text-sm text-slate-500">
                  There are no push events or pull requests for this team yet.
                </p>
              </div>
            ) : (
              activity.map((item) => {
                const iconMap = {
                  push: <GitBranch className="size-4" />,
                  "pr-open": <GitPullRequestArrow className="size-4" />,
                  "pr-merged": <GitMerge className="size-4" />,
                  commit: <GitCommit className="size-4" />,
                };

                const toneClasses = {
                  emerald: "bg-emerald-100 text-emerald-700",
                  amber: "bg-amber-100 text-amber-700",
                  slate: "bg-slate-100 text-slate-700",
                  red: "bg-red-100 text-red-700",
                };

                return (
                  <div key={item.id} className="flex gap-3 rounded-md border border-slate-200 p-3">
                    <div className={`mt-0.5 flex size-9 items-center justify-center rounded-md ${toneClasses[item.tone]}`}>
                      {iconMap[item.type]}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        <span className="text-xs text-slate-500">{item.time}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge variant="outline">{item.actor}</Badge>
                        <Badge variant="secondary">{item.type.replace("-", " ")}</Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent commits</CardTitle>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="size-3" />
              Fresh signals
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading commits...</p>
            ) : commits.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-200 p-6 text-center">
                <p className="font-medium text-slate-700">No commits found</p>
                <p className="mt-1 text-sm text-slate-500">
                  No commits have been pushed for this team yet.
                </p>
              </div>
            ) : (commits.map((commit) => (
              <div key={commit.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-slate-900">{commit.message}</p>
                  <Badge variant="secondary">{commit.branch}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{commit.repo}</span>
                  <span>•</span>
                  <span>{commit.author}</span>
                  <span>•</span>
                  <span>{commit.time}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-mono text-xs text-slate-500">{commit.commit}</span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={commit.url || "#"} target="_blank" rel="noopener noreferrer" className="gap-1">
                      <ArrowUpRight className="size-3" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            )))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
