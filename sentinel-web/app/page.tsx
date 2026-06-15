import Link from "next/link";
import { Activity, AlertTriangle, Clock3, GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { MetricCard } from "@/components/sentinel/metric-card";
import { getGitHubClient, fetchUserRepositories, fetchBranches, fetchRecentCommits } from "@/lib/supabase/github-client";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/sentinel/page-header";
import { deployments, incidents, logs, services, tasks, timeline } from "@/lib/data";

export default async function Home() {
  const { user, supabase } = await getGitHubClient();

  if (!user.user_metadata?.first_sync_done) {
    console.log("Performing first time GitHub data sync...");
    
    let { data: team } = await supabase
      .from('teams')
      .select('*')
      .eq('slug', user.user_metadata?.user_name || user.id)
      .maybeSingle();
      

// add this to ui that the it is maunully creating hte team wiht the name but in the ui you have to add make team feature 




    if (!team) {
      const { data: newTeam } = await supabase
        .from('teams')
        .insert({ 
          name: user.user_metadata?.full_name || user.user_metadata?.user_name || 'My Team', 
          slug: user.user_metadata?.user_name || user.id 
        })
        .select()
        .maybeSingle();
      team = newTeam;
    }

    if (team) {
      const repos = await fetchUserRepositories();
      for (const repoName of repos) {
        const { data: repo } = await supabase
          .from('repositories')
          .upsert({ 
             team_id: team.id,
             name: repoName.split('/')[1] || repoName,
             full_name: repoName,
             provider: 'github'
          }, { onConflict: 'full_name' })
          .select()
          .maybeSingle();
          
        if (repo) {
          const branches = await fetchBranches(repoName);
          for (const branch of branches) {
            await supabase
              .from('branches')
              .upsert({
                repository_id: repo.id,
                name: branch.name,
                is_default: branch.name === 'main' || branch.name === 'master'
              }, { onConflict: 'repository_id, name' });
          }
        }
      }
      
      const commits = await fetchRecentCommits(repos);
      for (const c of commits) {
         const { data: repo } = await supabase
           .from('repositories')
           .select('id')
           .eq('full_name', c.repo)
           .maybeSingle();
           
         if (repo) {
            let branchId = null;
            const { data: branch } = await supabase
              .from('branches')
              .select('id')
              .eq('repository_id', repo.id)
              .eq('name', c.branch)
              .maybeSingle();
              
            if (branch) branchId = branch.id;
            
            await supabase
              .from('commits')
              .upsert({
                 repository_id: repo.id,
                 branch_id: branchId,
                 sha: c.commit,
                 message: c.message,
                 author_handle: c.author,
                 committed_at: new Date().toISOString()
              }, { onConflict: 'sha' });
         }
      }
      
      await supabase.auth.updateUser({
         data: { first_sync_done: true }
      });
      console.log("First time GitHub data sync complete.");
    }
  }

  return (
    <AppShell>
      <PageHeader eyebrow="Live command center" title="AI-native incident operations" action="Create incident" />
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active incidents" value="3" detail="1 SEV-1 needs commander review" icon={AlertTriangle} tone="red" />
        <MetricCard title="Services healthy" value="3 / 5" detail="checkout-api and billing at risk" icon={Activity} tone="amber" />
        <MetricCard title="Deploy stability" value="91%" detail="Down 4% after checkout deploy" icon={GitBranch} tone="slate" />
        <MetricCard title="SLA risk" value="31m" detail="Time left on INC-1042 response" icon={Clock3} tone="emerald" />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]">
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
                  <Button variant="outline" size="sm">Open</Button>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>AI Root-Cause Brief</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-medium text-emerald-900">Most likely cause</p>
              <p className="mt-2 text-sm text-emerald-800">{incidents[0].rootCause}</p>
            </div>
            <div className="space-y-2 text-sm">
              <p className="font-medium">Suggested next actions</p>
              {tasks.slice(0, 3).map((task) => (
                <div key={task.title} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <span>{task.title}</span>
                  <Badge variant="outline">{task.assignee}</Badge>
                </div>
              ))}
            </div>
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
            {logs.slice(0, 4).map((log) => (
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
