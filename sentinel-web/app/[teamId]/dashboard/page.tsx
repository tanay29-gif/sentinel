import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Activity,
  AlertTriangle,
  Box,
  GitBranch,
  Server,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";


export default async function DashboardPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {


  const { teamId } = await params;
  const supabase = await createClient();
  // Replace these in Part 2



  // const services: any[] = [];
  // const incidents: any[] = [];
  // const workflowRuns: any[] = [];
  // const deployments: any[] = [];
  // const timeline: any[] = [];
  // const messages: any[] = [];

  // ---------------------- Services ----------------------

  const { data: servicesData } = await supabase
    .from("services")
    .select("id,name,health,uptime")
    .eq("team_id", teamId)
    .order("name");

  const services = servicesData ?? [];
  // ---------------------- Active Incidents ----------------------

  const { data: incidentsData = [], error: incidentsError} = await supabase
    .from("incidents")
    .select(`
    id,
    title,
    summary,
    severity,
    status,
    created_at,
    services(name)
  `)
    .eq("team_id", teamId)
    .neq("status", "Resolved")
    .order("created_at", { ascending: false })
    .limit(5);

  const incidents = incidentsData ?? [];
  // if(incidentsError) console.log(incidentsError);

  // ---------------------- Workflow Runs ----------------------

  const { data: workflowRunsData = [] } = await supabase
    .from("workflow_runs")
    .select(`
    id,
    workflow_name,
    branch,
    status,
    conclusion,
    actor,
    created_at
  `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(5);

  const workflowRuns = workflowRunsData ?? [];


  // ---------------------- Deployments ----------------------

  const { data: deploymentsData = [], error: deploymentsError} = await supabase
    .from("deployments")
    .select(`
    id,
    repository_full_name,
    environment,
    status,
    created_at
  `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(5);

  const deployments = deploymentsData ?? [];
  // if(deploymentsError) console.log(deploymentsError);

  // ---------------------- Workflow Timeline ----------------------

  const { data: workflowEventsData = [] } = await supabase
    .from("workflow_events")
    .select(`
    id,
    title,
    description,
    status,
    created_at
  `)
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(15);

  const workflowEvents = workflowEventsData ?? [];


  // ---------------------- Incident Timeline ----------------------

  const incidentIds =
    incidents.length > 0
      ? incidents.map(i => i.id)
      : [];

  const { data: incidentEventsData = [] } =
    incidentIds.length === 0
      ? { data: [] }
      : await supabase
        .from("incident_events")
        .select(`
          id,
          event,
          source,
          created_at,
          incident_id
        `)
        .in("incident_id", incidentIds)
        .order("created_at", { ascending: false })
        .limit(15);

  const incidentEvents = incidentEventsData ?? [];

  // ---------------------- Latest Incident Messages ----------------------

  const { data: channelsData = [] } = incidentIds.length
    ? await supabase
      .from("incident_channels")
      .select("id")
      .in("incident_id", incidentIds)
    : { data: [] };

  const channels = channelsData ?? [];


  const channelIds =
    channels.length > 0
      ? channels.map(c => c.id)
      : [];

const { data: messagesData = [] } =
  channelIds.length === 0
    ? { data: [] }
    : await supabase
        .from("incident_messages")
        .select(`
          id,
          message,
          created_at,
          sender_id,
          profiles!incident_messages_sender_id_fkey (
            full_name
          )
        `)
        .in("channel_id", channelIds)
        .order("created_at", { ascending: false })
        .limit(8);

        // console.log(messagesData);
  const messages = messagesData ?? [];
  // ---------------------- Metric Cards ----------------------

  const stats = {
    services: services.length,

    incidents: incidents.length,

    failedRuns: workflowRuns.filter(
      (r) =>
        r.conclusion === "failure" ||
        r.status === "failure"
    ).length,

    deployments: deployments.length,
  };

  // ---------------------- Unified Timeline ----------------------

  const timeline = [
    ...(workflowEvents ?? []).map((e) => ({
      id: e.id,
      type: "workflow",
      event: e.title ?? e.description,
      status: e.status,
      created_at: e.created_at,
    })),

    ...(incidentEvents ?? []).map((e) => ({
      id: e.id,
      type: "incident",
      event: e.event,
      status: e.source,
      created_at: e.created_at,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 20);

  return (
    <AppShell teamId={teamId}>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
      />

      {/* ================= Metrics ================= */}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-slate-500">
                Services
              </p>
              <p className="mt-2 text-3xl font-bold">
                {stats.services}
              </p>
            </div>

            <Server className="h-9 w-9 text-slate-400" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-slate-500">
                Active Incidents
              </p>

              <p className="mt-2 text-3xl font-bold text-red-600">
                {stats.incidents}
              </p>
            </div>

            <AlertTriangle className="h-9 w-9 text-red-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-slate-500">
                Failed Workflow Runs
              </p>

              <p className="mt-2 text-3xl font-bold text-orange-600">
                {stats.failedRuns}
              </p>
            </div>

            <GitBranch className="h-9 w-9 text-orange-500" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-slate-500">
                Deployments
              </p>

              <p className="mt-2 text-3xl font-bold">
                {stats.deployments}
              </p>
            </div>

            <Box className="h-9 w-9 text-sky-500" />
          </CardContent>
        </Card>

      </div>

      {/* ================= Service Health ================= */}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">

        <Card>

          <CardHeader>

            <CardTitle>
              Service Health
            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            {services.length === 0 && (
              <p className="text-sm text-slate-500">
                No services found.
              </p>
            )}

            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">
                    {service.name}
                  </p>

                  <p className="text-xs text-slate-500">
                    {service.health}
                  </p>
                </div>

                <Badge>
                  {service.health}
                </Badge>
              </div>
            ))}

          </CardContent>

        </Card>

        {/* ================= Recent Incidents ================= */}

        <Card>

          <CardHeader>

            <CardTitle>
              Recent Incidents
            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            {incidents.length === 0 && (
              <p className="text-sm text-slate-500">
                No incidents.
              </p>
            )}

            {incidents.map((incident) => (
              <div
                key={incident.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">

                  <p className="font-medium">
                    {incident.title}
                  </p>

                  <Badge>
                    {incident.severity}
                  </Badge>

                </div>

                <p className="mt-2 text-sm text-slate-600">
                  {incident.summary}
                </p>

              </div>
            ))}

          </CardContent>

        </Card>

      </div>

      {/* ================= Workflow Runs ================= */}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">

        <Card>

          <CardHeader>

            <CardTitle>
              Workflow Runs
            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            {workflowRuns.length === 0 && (
              <p className="text-sm text-slate-500">
                No workflow runs.
              </p>
            )}

            {workflowRuns.map((run) => (
              <div
                key={run.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">

                  <div>

                    <p className="font-medium">
                      {run.workflow_name}
                    </p>

                    <p className="text-xs text-slate-500">
                      {run.branch}
                    </p>

                  </div>

                  <Badge>
                    {run.status}
                  </Badge>

                </div>

              </div>
            ))}

          </CardContent>

        </Card>

        {/* ================= Deployments ================= */}

        <Card>

          <CardHeader>

            <CardTitle>
              Deployments
            </CardTitle>

          </CardHeader>

          <CardContent className="space-y-4">

            {deployments.length === 0 && (
              <p className="text-sm text-slate-500">
                No deployments.
              </p>
            )}

            {deployments.map((deployment) => (
              <div
                key={deployment.id}
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">

                  <div>

                    <p className="font-medium">
                      {deployment.environment}
                    </p>

                    <p className="text-xs text-slate-500">
                      {deployment.repository_full_name}
                    </p>

                  </div>

                  <Badge>
                    {deployment.status}
                  </Badge>

                </div>

              </div>
            ))}

          </CardContent>

        </Card>

      </div>

      {/* ================= Unified Timeline ================= */}

      <Card className="mt-8">

        <CardHeader>

          <CardTitle>
            Activity Timeline
          </CardTitle>

        </CardHeader>

        <CardContent className="space-y-4">

          {timeline.length === 0 && (
            <p className="text-sm text-slate-500">
              No events.
            </p>
          )}

          {timeline.map((event) => (
            <div
              key={event.id}
              className="flex gap-4 border-l-2 pl-4"
            >
              <Clock className="mt-1 h-4 w-4 text-slate-400" />

              <div>

                <p className="font-medium">
                  {event.event}
                </p>

                <p className="text-xs text-slate-500">
                  {event.created_at}
                </p>

              </div>

            </div>
          ))}

        </CardContent>

      </Card>

      {/* ================= Incident Messages ================= */}

      <Card className="mt-8">

        <CardHeader>

          <CardTitle>
            Latest Incident Messages
          </CardTitle>

        </CardHeader>

        <CardContent className="space-y-4">

          {messages.length === 0 && (
            <p className="text-sm text-slate-500">
              No messages.
            </p>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-lg border p-4"
            >
              <div className="flex items-center justify-between">

                {/* <p className="font-medium">
                  {message.profiles?.full_name}
                </p> */}

                <Badge variant="secondary">
                  Chat
                </Badge>

              </div>

              <p className="mt-2 text-sm">
                {message.message}
              </p>

            </div>
          ))}

        </CardContent>

      </Card>

    </AppShell>
  );
}