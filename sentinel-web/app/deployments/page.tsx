import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { deployments } from "@/lib/data";

export default function DeploymentsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="GitHub / GitLab" title="Deployment & Commit Tracking" action="Connect repo" />
      <Card className="rounded-md">
        <CardHeader><CardTitle>Deployment Feed</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {deployments.map((deployment) => (
            <div key={deployment.id} className="grid gap-3 rounded-md border border-slate-200 p-4 md:grid-cols-[90px_1fr_110px_110px_110px] md:items-center">
              <span className="font-mono text-sm text-slate-500">{deployment.id}</span>
              <div>
                <p className="font-medium">{deployment.repo}</p>
                <p className="text-sm text-slate-500">Commit {deployment.commit} by {deployment.author} / {deployment.time}</p>
              </div>
              <Badge variant="outline">{deployment.env}</Badge>
              <Badge variant={deployment.status === "Suspect" ? "destructive" : deployment.status === "Passed" ? "secondary" : "outline"}>{deployment.status}</Badge>
              <Button variant="outline" size="sm">Diff</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </AppShell>
  );
}
