import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock3, GitBranch, ListTree } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { MetricCard } from "@/components/sentinel/metric-card";
import { PageHeader } from "@/components/sentinel/page-header";
import { deployments, incidents, logs as mockLogs, services, timeline } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

type Repository = {
  id: string;
  name: string;
  full_name: string;
  html_url: string | null;
  default_branch: string | null;
};

type Branch = {
  id: string;
  repository_id: string;
  name: string;
  is_default: boolean | null;
};

type Commit = {
  id: string;
  repository_id: string;
  sha: string;
  message: string;
  author_handle: string | null;
  committed_at: string;
};

type LogRow = {
  id: string;
  level: string;
  message: string;
  job_name: string | null;
  created_at: string;
};

type Params = Promise<{ teamId: string }>;

export default async function DashboardPage({ params }: { params: Params }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { teamId } = await params;
  

  let membershipQuery = supabase
    .from("memberships")
    .select("team_id, teams(name, github_installation_id)")
    .eq("user_id", user.id);

  if (teamId) {
    membershipQuery = membershipQuery.eq("team_id", teamId);
  }

  const { data: membership } = await membershipQuery.limit(1).maybeSingle();

  if (!membership?.team_id) {
    redirect("/");
  }

  const team = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;

  if (!team?.github_installation_id) {
    redirect(`/installation?team_id=${membership.team_id}`);
  }

  const [{ data: repositories }, { data: branches }, { data: commits }, { data: syncedLogs }] = await Promise.all([
    supabase
      .from("repositories")
      .select("id, name, full_name, html_url, default_branch")
      .eq("team_id", membership.team_id)
      .order("updated_at", { ascending: false }),
    supabase.from("branches").select("id, repository_id, name, is_default").order("is_default", { ascending: false }),
    supabase
      .from("commits")
      .select("id, repository_id, sha, message, author_handle, committed_at")
      .order("committed_at", { ascending: false })
      .limit(25),
    supabase
      .from("logs")
      .select("id, level, message, job_name, created_at")
      .eq("team_id", membership.team_id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const repoRows = (repositories ?? []) as Repository[];
  const branchRows = (branches ?? []) as Branch[];
  const commitRows = (commits ?? []) as Commit[];
  const logRows = (syncedLogs ?? []) as LogRow[];
  const repoById = new Map(repoRows.map((repo) => [repo.id, repo]));

  return (
    <AppShell teamId={teamId}>
      <PageHeader eyebrow={team.name} title="Sentinel dashboard" action="Create incident" />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Repositories synced" value={String(repoRows.length)} detail="From the installed GitHub App" icon={GitBranch} tone="emerald" />
        <MetricCard title="Branches tracked" value={String(branchRows.length)} detail="All selected repository branches" icon={ListTree} tone="slate" />
        <MetricCard title="Recent commits" value={String(commitRows.length)} detail="Latest five per synced repository" icon={GitBranch} tone="amber" />
        <MetricCard title="Workflow logs" value={String(logRows.length)} detail="Latest GitHub Actions runs" icon={Clock3} tone="red" />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Repositories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {repoRows.length ? (
              repoRows.map((repo) => {
                const repoBranches = branchRows.filter((branch) => branch.repository_id === repo.id);
                return (
                  <div key={repo.id} className="rounded-md border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{repo.full_name}</p>
                        <p className="text-sm text-slate-500">{repoBranches.length} branches tracked</p>
                      </div>
                      <Badge variant="outline">{repo.default_branch ?? "main"}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {repoBranches.slice(0, 8).map((branch) => (
                        <Badge key={branch.id} variant={branch.is_default ? "secondary" : "outline"}>
                          {branch.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">No repositories synced yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Latest Commits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {commitRows.slice(0, 10).map((commit) => {
              const repo = repoById.get(commit.repository_id);
              return (
                <div key={commit.id} className="rounded-md border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{repo?.full_name ?? "Repository"}</span>
                    <span className="font-mono text-xs text-slate-500">{commit.sha.slice(0, 7)}</span>
                  </div>
                  <p className="mt-2 text-slate-700">{commit.message}</p>
                  <p className="mt-1 text-xs text-slate-500">{commit.author_handle ?? "Unknown author"}</p>
                </div>
              );
            })}
            {!commitRows.length ? <p className="text-sm text-slate-500">No commits synced yet.</p> : null}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Last 5 Workflow Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logRows.map((log) => (
              <div key={log.id} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant={log.level === "ERROR" ? "destructive" : "secondary"}>{log.level}</Badge>
                  <span className="text-xs text-slate-500">{log.job_name ?? "GitHub Actions"}</span>
                </div>
                <p className="mt-2">{log.message}</p>
              </div>
            ))}
            {!logRows.length ? <p className="text-sm text-slate-500">No workflow logs synced yet.</p> : null}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Incident Triage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {incidents.map((incident) => (
              <Link
                key={incident.id}
                href={`/incidents/${incident.id === "INC-1042" ? "INC-1042" : ""}`}
                className="block rounded-md border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={incident.severity === "SEV-1" ? "destructive" : "secondary"}>{incident.severity}</Badge>
                  <Badge variant="outline">{incident.status}</Badge>
                  <span className="text-xs text-slate-500">{incident.started}</span>
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{incident.title}</p>
                    <p className="text-sm text-slate-500">{incident.summary}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Open
                  </Button>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="rounded-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Event Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {timeline.map((item) => (
                <div key={`${item.time}-${item.source}`} className="grid grid-cols-[64px_96px_1fr] gap-3 text-sm">
                  <span className="font-mono text-slate-500">{item.time}</span>
                  <Badge variant="outline">{item.source}</Badge>
                  <span>{item.event}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Live Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockLogs.slice(0, 4).map((log) => (
              <div key={`${log.time}-${log.trace}`} className="rounded-md bg-slate-50 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <Badge variant={log.level === "ERROR" ? "destructive" : "secondary"}>{log.level}</Badge>
                  <span className="font-mono text-xs text-slate-500">{log.time}</span>
                </div>
                <p className="mt-2">{log.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Service Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((service) => (
              <div key={service.name} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span className="font-medium">{service.name}</span>
                <span className="text-slate-500">{service.uptime}</span>
                <Badge variant={service.health === "Healthy" ? "secondary" : "destructive"}>{service.health}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Deployment Watch</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{deployment.repo}</span>
                  <span className="ml-2 font-mono text-xs text-slate-500">{deployment.commit}</span>
                </span>
                <Badge variant={deployment.status === "Suspect" ? "destructive" : "outline"}>{deployment.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </AppShell>
  );
}
