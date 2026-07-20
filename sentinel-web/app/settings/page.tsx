import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";

export default async function SettingsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;

  return (
    <AppShell params={params}>
      <PageHeader eyebrow="Workspace admin" title="Teams, Integrations & RBAC" action="Invite member" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-md">
          <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {["Owner", "Incident Commander", "Responder", "Viewer"].map((role) => (
              <div key={role} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <span className="font-medium">{role}</span>
                <Badge variant="outline">RBAC policy</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader><CardTitle>Integrations</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {["Supabase Auth", "Supabase Realtime", "GitHub", "GitLab", "Slack", "Grafana", "Jira", "Groq"].map((integration) => (
              <div key={integration} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium">{integration}</p>
                <p className="text-sm text-slate-500">Ready to configure</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
