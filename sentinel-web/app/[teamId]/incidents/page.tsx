"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";
import CreateIncidentSidebar from "@/components/sentinel/CreateIncidentSidebar";


interface Incident {
  id: string;
  title: string;
  severity: string;
  status: string;
  summary: string;
  created_at: string;
  resolved_at: string | null;

  services: {
    name: string;
  } | null;

  source: string | null;
}

interface IncidentsResponse {
  incidents: Incident[];
  userRole: "owner" | "engineer" | "viewer";
  userId: string;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityVariant(severity: string) {
  switch (severity) {
    case "SEV-1":
      return "destructive";

    case "SEV-2":
      return "default";

    case "SEV-3":
      return "secondary";

    default:
      return "outline";
  }
}

function canInvestigate(userRole: string): boolean {
  // Owner and engineer can investigate
  return userRole === "owner" || userRole === "engineer";
}

export default function IncidentsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [teamId, setTeamId] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      try {
        const resolvedParams = await params;
        const tId = resolvedParams.teamId;
        setTeamId(tId);

        const response = await fetch(`/api/incident?teamId=${tId}`);

        if (!response.ok) {
          if (response.status === 401) {
            setError("You are not authenticated. Please sign in.");
          } else if (response.status === 403) {
            setError("You are not a member of this team.");
          } else {
            setError("Failed to fetch incidents");
          }
          return;
        }

        const data: IncidentsResponse = await response.json();
        setIncidents(data.incidents);
        setUserRole(data.userRole);
      } catch (err) {
        setError("Error loading incidents");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params]);

  if (loading) {
    return (
      <AppShell teamId={teamId}>
        <PageHeader eyebrow="Triage queue" title="Incidents" action="New incident" />
        <Card className="rounded-md">
          <CardContent className="p-8 text-center text-slate-500">
            Loading incidents...
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell teamId={teamId}>
        <PageHeader eyebrow="Triage queue" title="Incidents" action="New incident" />
        <Card className="rounded-md">
          <CardContent className="p-8 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const hasInvestigateAccess = canInvestigate(userRole);

  return (
    <AppShell teamId={teamId}>
      <PageHeader eyebrow="Triage queue" title="Incidents" action={<CreateIncidentSidebar />}
 />
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Real-time Incident Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">

              <p className="text-lg font-medium">

                No Active Incidents

              </p>

              <p className="text-sm text-slate-500 mt-2">

                Sentinel hasn't detected any active issues.

              </p>

            </div>
          ) : (
            incidents.map((incident) => {
              return (
                <div
                  key={incident.id}
                  className="rounded-md border border-slate-200 p-5 hover:bg-slate-50 transition"
                >

                  <div className="flex items-start justify-between">

                    <div className="space-y-2">

                      <div className="flex items-center gap-2">

                        <Badge variant={severityVariant(incident.severity)}>
                          {incident.severity}
                        </Badge>

                        <Badge variant="outline">
                          {incident.status}
                        </Badge>

                        {incident.source && (

                          <Badge variant="secondary">

                            {incident.source.toUpperCase()}

                          </Badge>

                        )}

                      </div>

                      <h3 className="font-semibold text-lg">

                        {incident.title}

                      </h3>

                      <p className="text-sm text-slate-600">

                        {incident.summary}

                      </p>

                    </div>

                    {hasInvestigateAccess && (

                      <Button asChild>

                        <Link href={`/${teamId}/incidents/${incident.id}`}>

                          Investigate

                        </Link>

                      </Button>

                    )}

                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-6 text-sm text-slate-500">

                    <span>

                      <strong>ID:</strong> {incident.id.slice(0, 8)}

                    </span>

                    <span>

                      <strong>Created:</strong>{" "}

                      {formatDate(incident.created_at)}

                    </span>

                    <span>
                      <strong>{incident.services?.name ? "Service:" : "Source:"}</strong>{" "}
                      {incident.services?.name ?? incident.source ?? "Platform"}
                    </span>

                  </div>

                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
