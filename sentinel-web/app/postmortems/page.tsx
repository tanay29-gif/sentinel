import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { timeline } from "@/lib/data";

export default function PostmortemsPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="Learning loop" title="Auto-generated Postmortems" action="Generate draft" />
      <Card className="rounded-md">
        <CardHeader><CardTitle>INC-1042 Draft</CardTitle></CardHeader>
        <CardContent className="space-y-5 text-sm">
          <section>
            <Badge variant="destructive">SEV-1</Badge>
            <h2 className="mt-3 text-lg font-semibold">Checkout API latency above SLO</h2>
            <p className="mt-1 text-slate-600">Customer checkout experienced elevated latency and retry rates after production deployment DEP-884.</p>
          </section>
          <section>
            <p className="font-medium">Timeline</p>
            <div className="mt-2 space-y-2">
              {timeline.map((item) => (
                <p key={item.time} className="rounded-md bg-slate-50 p-2"><span className="font-mono text-slate-500">{item.time}</span> / {item.event}</p>
              ))}
            </div>
          </section>
          <section>
            <p className="font-medium">Action Items</p>
            <p className="mt-1 text-slate-600">Add deploy canary for cache miss ratio, require rollback playbook owner, and add trace sampling for inventory hydrate calls.</p>
          </section>
          <Button>Publish to Notion</Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
