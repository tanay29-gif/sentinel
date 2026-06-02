import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import { tasks } from "@/lib/data";

export default function TasksPage() {
  return (
    <AppShell>
      <PageHeader eyebrow="SLA workflow" title="Assignments & Escalations" action="Assign task" />
      <div className="grid gap-4 md:grid-cols-3">
        {["Open", "In progress", "Queued"].map((column) => (
          <Card key={column} className="rounded-md">
            <CardHeader><CardTitle>{column}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {tasks.filter((task) => task.status === column).map((task) => (
                <div key={task.title} className="rounded-md border border-slate-200 p-3">
                  <Badge variant={task.priority === "P0" ? "destructive" : "outline"}>{task.priority}</Badge>
                  <p className="mt-3 text-sm font-medium">{task.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{task.assignee} / due {task.due}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
