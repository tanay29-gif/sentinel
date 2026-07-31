"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/sentinel/app-shell";
import { PageHeader } from "@/components/sentinel/page-header";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Incident {
  id: string;
  team_id: string;

  title: string;
  severity: string;
  status: string;

  summary: string;

  root_cause_suggestion: string;

  created_at: string;

  resolved_at: string | null;

  ai_summary: string | null;

  ai_metadata: any;

  source: string;

  services: {
    name: string;
  } | null;
}

interface IncidentEvent {
  id: string;

  source: string;

  event: string;

  provenance: any;

  created_at: string;
}

interface IncidentMessage {
  id: string;

  message: string;

  created_at: string;

  profiles: {
    full_name: string;
  } | null;
}

interface IncidentResponse {
  incident: Incident;

  events: IncidentEvent[];

  messages: IncidentMessage[];
  githubUrl: string;
  logPath: string;
  userRole: string;
}
interface Analysis {
            rootCause: string ,
            explanation: string,
            suggestedFix: string,
            confidence: string,
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",

    hour: "2-digit",

    minute: "2-digit",
  });
}



export default function IncidentDetailsPage({
  params,
}: {
  params: Promise<{
    teamId: string;

    incidentId: string;
  }>;
}) {
  const [teamId, setTeamId] = useState("");

  const [incidentId, setIncidentId] = useState("");

  const [incident, setIncident] = useState<Incident | null>(null);

  const [events, setEvents] = useState<IncidentEvent[]>([]);

  const [messages, setMessages] = useState<IncidentMessage[]>([]);
  const [githubUrl, setGithubUrl] = useState<string>("");

  const [loading, setLoading] = useState(true);

  const [newMessage, setNewMessage] = useState("");

  const [userRole, setUserRole] = useState("");

  const [error, setError] = useState("");

  const [loadingAI, setLoadingAI] = useState(false);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const [logPath, setLogPath] = useState("");

  const [isDownloading, setIsDownloading] = useState(false);


  const router = useRouter();

  useEffect(() => {
    async function load() {
      try {
        const resolved = await params;

        setTeamId(resolved.teamId);

        setIncidentId(resolved.incidentId);

        const response = await fetch(
          `/api/incident/${resolved.incidentId}?teamId=${resolved.teamId}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch incident");
        }

        const data: IncidentResponse = await response.json();

        setIncident(data.incident);

        setEvents(data.events);

        setMessages(data.messages);

        // console.log("setGithubUrl",data.githubUrl)
        // console.log("setLogPath",data.logPath)
        setGithubUrl(data.githubUrl);
        setUserRole(data.userRole);
        setLogPath(data.logPath);

      } catch (err) {
        console.error(err);

        setError("Unable to load incident.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [params]);

  if (loading) {
    return (
      <AppShell teamId={teamId}>
        <PageHeader
          eyebrow="Incident"
          title="Loading..."
        />

        <Card>
          <CardContent className="py-12 text-center">
            Loading Incident...
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  if (error || !incident) {
    return (
      <AppShell teamId={teamId}>
        <PageHeader
          eyebrow="Incident"
          title="Incident"
        />

        <Card>
          <CardContent className="py-12 text-center text-red-500">
            {error}
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const canResolve =
    incident.source === "manual" &&
    (userRole === "owner" || userRole === "engineer");

  async function resolveIncident() {
    if (!incident) return;
    const response = await fetch(
      `/api/incident/${incident.id}/resolve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teamId,
        }),
      }
    );

    if (response.ok) {
      setIncident(prev =>
        prev
          ? {
            ...prev,
            status: "Resolved",
            resolved_at: new Date().toISOString(),
          }
          : prev
      );

      router.push(`/${teamId}/incidents`);
    }
  }

  async function generateSummary() {
    if (!incident) return;

    try {
      setLoadingAI(true);

      const res = await fetch(
        `/api/incident/${incident.id}/analysis?teamId=${teamId}`
      );

      const data = await res.json();

      setAnalysis(data.analysis);
    } finally {
      setLoadingAI(false);
    }
  }

  async function sendMessage() {

    if (!newMessage.trim()) return;

    const response = await fetch(
      `/api/incident/${incidentId}/messages`,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({

          message: newMessage,

          teamId,

        }),
      }
    );

    if (!response.ok) return;

    const data = await response.json();

    setMessages((prev) => [...prev, data.message]);

    setNewMessage("");

  }

  async function downloadLogs() {
    if (!incident) return;
    setIsDownloading(true);

    try {
      const res = await fetch(`/api/incident/${incident.id}/logs`);

      if (!res.ok) {
        alert("Could not retrieve log download link");
        return;
      }

      const data = await res.json();
      // data.url should be the pre-signed S3 URL or download path
      window.open(data.url, "_blank");
    } catch (err) {
      console.error("Error downloading logs:", err);
    } finally {
      setIsDownloading(false);
    }
  }


  function openGithub() {
    if (!githubUrl) return;

    window.open(githubUrl, "_blank");
  }

  return (
    <AppShell teamId={teamId}>
      <PageHeader
        eyebrow="Incident Investigation"
        title={incident.title}
      />

      <div className="space-y-6">

        {/* Incident Header */}

        <Card>

          <CardContent className="p-6">

            <div className="flex justify-between items-start">

              <div>

                <div className="flex gap-2">

                  <Badge
                    variant={
                      incident.severity === "SEV-1"
                        ? "destructive"
                        : incident.severity === "SEV-2"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {incident.severity}
                  </Badge>

                  <Badge variant="outline">
                    {incident.status}
                  </Badge>

                </div>

                <h2 className="text-2xl font-semibold mt-3">

                  {incident.title}

                </h2>

                <p className="text-slate-500 mt-2">

                  {incident.summary}

                </p>

              </div>

              <div className="text-right text-sm text-slate-500">

                <p>

                  Created

                </p>

                <p>

                  {formatDate(incident.created_at)}

                </p>

                <div className="mt-4">

                  <p>

                    Service

                  </p>

                  <p className="font-medium">

                    {incident.services?.name ?? "Workflow / Deployment"}

                  </p>

                </div>

              </div>

            </div>

          </CardContent>

        </Card>

        {/* Main Layout */}

        <div className="grid gap-6 lg:grid-cols-[1fr_420px]">

          {/* Timeline */}

          <Card>

            <CardHeader>

              <CardTitle>

                Timeline

              </CardTitle>

            </CardHeader>

            <CardContent>

              <div className="space-y-6">
                {events.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No timeline events available.
                  </p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="relative pl-8 border-l border-slate-300"
                    >
                      <div className="absolute left-[-7px] top-1 h-3 w-3 rounded-full bg-slate-700" />

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <p className="font-medium">
                            {event.event}
                          </p>

                          <span className="text-xs text-slate-500">
                            {formatDate(event.created_at)}
                          </span>
                        </div>

                        <Badge
                          variant="outline"
                          className="text-xs"
                        >
                          {event.source}
                        </Badge>

                        {event.provenance && (
                          <pre className="mt-2 rounded bg-slate-100 p-3 text-xs overflow-auto">
                            {JSON.stringify(event.provenance, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

            </CardContent>

          </Card>

          {/* Incident Channel */}

          <Card>

            <CardHeader>

              <CardTitle>

                Incident Channel

              </CardTitle>

            </CardHeader>

            <CardContent>

              <div className="flex h-[550px] flex-col">

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">

                  {messages.length === 0 ? (

                    <div className="text-center text-slate-500 text-sm mt-20">

                      No conversation yet.

                    </div>

                  ) : (

                    messages.map((message) => (

                      <div
                        key={message.id}
                        className="rounded-md border border-slate-200 p-3"
                      >

                        <div className="flex justify-between">

                          <p className="font-medium">

                            {message.profiles?.full_name ?? "Unknown"}

                          </p>

                          <span className="text-xs text-slate-500">

                            {formatDate(message.created_at)}

                          </span>

                        </div>

                        <p className="mt-2 text-sm">

                          {message.message}

                        </p>

                      </div>

                    ))

                  )}

                </div>

                <div className="mt-4 border-t pt-4">

                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                    placeholder="Write an update..."
                    className="w-full rounded-md border border-slate-300 p-3 text-sm"
                  />

                  <Button
                    className="mt-3 w-full"
                    onClick={sendMessage}

                  >
                    Send Message
                  </Button>

                </div>

              </div>

            </CardContent>

          </Card>

        </div>

        {/* Root Cause */}
        {/* AI Analysis */}

        {incident.source !== "manual" &&
          (analysis || incident.ai_summary) && (
            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">

                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    Root Cause
                  </p>

                  <p className="mt-1">
                    {analysis?.rootCause ??
                      incident.root_cause_suggestion}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    Explanation
                  </p>

                  <p className="mt-1">
                    {analysis?.explanation ??
                      incident.ai_summary}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-600">
                    Suggested Fix
                  </p>

                  <p className="mt-1">
                    {analysis?.suggestedFix ??
                      incident.ai_metadata?.suggestedFix}
                  </p>
                </div>

                <div className="flex gap-6">

                  <div>
                    <p className="text-sm font-semibold text-slate-600">
                      Confidence
                    </p>

                    <p>
                      {analysis?.confidence ??
                        incident.ai_metadata?.confidence}
                    </p>
                  </div>

                  {incident.ai_metadata?.generatedAt && (
                    <div>
                      <p className="text-sm font-semibold text-slate-600">
                        Generated
                      </p>

                      <p>
                        {formatDate(
                          incident.ai_metadata.generatedAt
                        )}
                      </p>
                    </div>
                  )}

                </div>

              </CardContent>
            </Card>
          )}


        {/* Actions */}

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex flex-wrap gap-3">

              {canResolve && (
                <Button onClick={resolveIncident}>
                  Resolve Incident
                </Button>
              )}

              {logPath && (
                <Button
                  variant="outline"
                  onClick={downloadLogs}
                  disabled={isDownloading}
                >
                  {isDownloading ? "Preparing Logs..." : "Download Logs"}
                </Button>
              )}
              {githubUrl && (
                <Button
                  variant="outline"
                  onClick={openGithub}
                >
                  Open GitHub
                </Button>
              )}

              {incident.source !== "manual" &&
                !incident.ai_summary && (
                  <Button
                    variant="secondary"
                    onClick={generateSummary}
                    disabled={loadingAI}
                  >
                    {loadingAI
                      ? "Generating AI Analysis..."
                      : "Generate AI Analysis"}
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>

      </div>

    </AppShell>
  );
}