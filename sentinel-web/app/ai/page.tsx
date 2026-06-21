import { Bot, SendHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";

export default function AiPage() {

  console.log("Rendering AI Page");
  return (
    <AppShell>
      <PageHeader eyebrow="Groq Llama 3" title="Conversational Incident Copilot" action="New chat" />
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="rounded-md">
          <CardHeader><CardTitle>Ask Logs, Incidents, Deployments</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-slate-100 p-4 text-sm">
              <p className="font-medium">You</p>
              <p className="text-slate-600">Why did checkout latency spike after the latest deploy?</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium text-emerald-900"><Bot className="size-4" /> Sentinel AI</div>
              <p className="mt-2 text-emerald-800">
                The strongest correlation is DEP-884. After commit 4f9c2a1, cache miss warnings rose before inventory hydrate timeouts. Suggested fix: roll back the cache key change or hotfix product_detail key generation.
              </p>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Ask: summarize errors for checkout-api in the last 30 minutes" />
              <Button aria-label="Send"><SendHorizontal className="size-4" /></Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardHeader><CardTitle>Prompt Shortcuts</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {["Summarize active incidents", "Find risky deployments", "Generate postmortem", "Predict anomaly risk"].map((prompt) => (
              <Badge key={prompt} variant="outline" className="mr-2 h-7">{prompt}</Badge>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
