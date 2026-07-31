"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, GitBranch, GitCommitHorizontal, LoaderCircle, Radio, Rocket, Shield, TerminalSquare, XCircle } from "lucide-react";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/client";

type DeploymentRow = {
  id: string;
  repository_full_name: string;
  commit_sha: string;
  workflow_run_id: string;
  environment: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export interface WorkflowEventRow {
  id: string;
  workflow_run_id: string;
  repository_id: string;
  team_id: string;
  workflow_job_id: string | number | null;
  github_job_id: number | null;
  event_type: string;
  level: "INFO" | "WARN" | "ERROR";
  title: string;
  description: string;
  status: "queued" | "in_progress" | "completed";
  created_at: string;
}

type WorkflowRunRow = {
  id: string;
  workflow_name: string | null;
  branch: string | null;
  commit_sha: string | null;
  actor: string | null;
  status: string | null;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  duration_ms: number | null;
  html_url: string | null;
};

type WorkflowJobRow = {
  id: string;
  workflow_run_id: string;
  github_job_id: number | null;
  name: string | null;
  conclusion: string | null;
  runner_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  github_run_id: number | null;
  runner_group_name: string | null;
  status: string | null;
  html_url: string | null;
};

type WorkflowStepRow = {
  id: string;
  workflow_job_id: string | null;
  step_name: string | null;
  status: string | null;
  step_number: number | null;
  started_at: string | null;
  completed_at: string | null;
  conclusion: string | null;
};

type WorkflowLogRow = {
  id: string;
  workflow_run_id: string;
  team_id: string;
  repository_id: string;
  source: string | null;
  storage_path: string;
  size: number | null;
  created_at: string | null;
};

type PipelineJob = {
  id: string;
  name: string;
  status: "queued" | "in_progress" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
  htmlUrl: string | null;
  failedSteps: Array<{
    name: string;
    status: string;
    conclusion: string | null;
  }>;
};

type PipelineRun = {
  id: string;
  repository: string;
  workflow: string;
  environment: string;
  branch: string;
  commit: string;
  status: "Success" | "Failed" | "Running" | "Queued";
  duration: string;
  triggeredBy: string;
  completedAt: string;
  startedAt: string;
  timeline: Array<{
    label: string;
    time: string;
    status: "complete" | "current" | "pending" | "failed";
    description: string;
  }>;
  jobs: PipelineJob[];
  failureDetails?: {
    jobId: string | null;
    failedJob: string;
    failedStep: string;
    failedSteps: Array<{
      name: string;
      status: string;
      conclusion: string | null;
    }>;
    logsStoragePath: string | null;
    htmlUrl: string | null;
    incidentUrl: string;
  } | null;
};

export interface PipelineTimelineItem {
  label: string;
  description: string;
  time: string;
  status: "pending" | "current" | "complete" | "failed";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDuration(startedAt: string | null | undefined, completedAt: string | null | undefined) {
  if (!startedAt) {
    return "—";
  }

  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return "—";
  }

  const seconds = Math.max(1, Math.round((end - start) / 1000));

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function normalizeStatus(value: string | null | undefined) {
  const normalized = (value ?? "").toLowerCase();

  if (["success", "succeeded", "completed"].includes(normalized)) {
    return "Success" as const;
  }

  if (["failure", "failed", "errored", "cancelled"].includes(normalized)) {
    return "Failed" as const;
  }

  if (["running", "in_progress", "inprogress", "pending", "queued"].includes(normalized)) {
    return "Running" as const;
  }

  return "Queued" as const;
}

function statusVariant(status: PipelineRun["status"]) {
  if (status === "Failed") {
    return "destructive" as const;
  }

  if (status === "Success") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function mapTimelineStatus(event: WorkflowEventRow): PipelineTimelineItem["status"] {
  if (event.level === "ERROR" || /fail|error/i.test(event.title) || /fail|error/i.test(event.description)) {
    return "failed";
  }

  switch (event.status) {
    case "queued":
      return "pending";

    case "in_progress":
      return "current";

    case "completed":
      return "complete";

    default:
      return "pending";
  }
}

function buildTimeline(events: WorkflowEventRow[]): PipelineTimelineItem[] {
  return events
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    )
    .map((event) => ({
      label: event.title,

      description: event.description,

      time: event.created_at,

      status: mapTimelineStatus(event),
    }));
}

type JobEventStatus = "queued" | "in_progress" | "completed" | "failed";

type NormalizedJobEvent = {
  status: JobEventStatus;
  title: string;
  description: string;
  startedAt: string | null;
  completedAt: string | null;
};

function normalizeJobEvents(events: WorkflowEventRow[]): NormalizedJobEvent {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const latest = sortedEvents[sortedEvents.length - 1];

  if (!latest) {
    return {
      status: "queued",
      title: "Unknown job",
      description: "No job events are available.",
      startedAt: null,
      completedAt: null,
    };
  }

  const failed = latest.level === "ERROR" || /failed|error/i.test(latest.title ?? "") || latest.event_type === "job_failed";
  const inProgress = latest.status === "in_progress" || latest.event_type === "job_started";
  const queued = latest.status === "queued" || latest.event_type === "job_queued";
  const completed = latest.status === "completed" || latest.event_type === "job_completed";
  const status: JobEventStatus = failed
    ? "failed"
    : inProgress
      ? "in_progress"
      : completed
        ? "completed"
        : queued
          ? "queued"
          : "queued";

  return {
    status,
    title: latest.title ?? "Unnamed job",
    description: latest.description ?? "",
    startedAt: sortedEvents.find((event) => event.status === "queued" || event.event_type === "job_queued")?.created_at ?? sortedEvents[0]?.created_at ?? null,
    completedAt: completed ? latest.created_at : null,
  };
}


function mapWorkflowRuns(
  workflowRuns: WorkflowRunRow[],
  deployments: DeploymentRow[],
  workflowEvents: WorkflowEventRow[],
  workflowJobs: WorkflowJobRow[],
  workflowSteps: WorkflowStepRow[],
  workflowLogs: WorkflowLogRow[]
): PipelineRun[] {
  const deploymentLookup = new Map<string, DeploymentRow>();
  const eventLookup = new Map<string, WorkflowEventRow[]>();
  const stepLookup = new Map<string, WorkflowStepRow[]>();
  const logLookup = new Map<string, WorkflowLogRow>();
  const jobMetadata = new Map<string, { internalId: string; htmlUrl: string | null; name: string | null }>();

  for (const event of workflowEvents) {
    const current = eventLookup.get(event.workflow_run_id);

    if (current) {
      current.push(event);
    } else {
      eventLookup.set(event.workflow_run_id, [event]);
    }
  }

  for (const job of workflowJobs) {
    const metadata = {
      internalId: job.id,
      htmlUrl: job.html_url ?? null,
      name: job.name ?? null,
    };

    jobMetadata.set(job.id, metadata);

    if (job.github_job_id != null) {
      jobMetadata.set(String(job.github_job_id), metadata);
    }
  }

  for (const log of workflowLogs) {
    logLookup.set(log.workflow_run_id, log);
  }

  for (const step of workflowSteps) {
    const key = step.workflow_job_id ?? "";
    const current = stepLookup.get(key);

    if (current) {
      current.push(step);
    } else {
      stepLookup.set(key, [step]);
    }
  }

  for (const deployment of deployments) {
    deploymentLookup.set(deployment.workflow_run_id, deployment);
  }

  if (workflowRuns.length > 0) {
    return workflowRuns.map((run) => {
      const deployment = deploymentLookup.get(run.id);
      const startedAt = run.started_at ?? run.created_at ?? null;
      const completedAt = run.completed_at ?? run.started_at ?? null;
      const status = normalizeStatus(run.conclusion ?? run.status ?? deployment?.status);
      const environment = deployment?.environment ?? (run.workflow_name?.toLowerCase().includes("prod") ? "production" : "staging");
      const events = eventLookup.get(run.id) ?? [];
      const jobEventGroups = new Map<string, WorkflowEventRow[]>();

      for (const event of events) {
        const jobId = event.github_job_id ?? event.workflow_job_id;
        if (jobId == null) {
          continue;
        }

        const key = String(jobId);
        const current = jobEventGroups.get(key);

        if (current) {
          current.push(event);
        } else {
          jobEventGroups.set(key, [event]);
        }
      }

      const jobs = Array.from(jobEventGroups.entries()).map(([jobKey, jobEvents]) => {
        const metadata = jobMetadata.get(jobKey);
        const normalized = normalizeJobEvents(jobEvents);
        const stepJobId = metadata?.internalId ?? jobKey;
        const steps = stepJobId ? (stepLookup.get(stepJobId) ?? []) : [];
        const failedSteps = steps
          .map((step) => ({
            name: step.step_name ?? "Unnamed step",
            status: step.conclusion === "failure" ? "failed" : (step.status ?? "queued"),
            conclusion: step.conclusion,
          }))
          .filter((step) => step.status === "failed" || step.conclusion === "failure");

        return {
          id: jobKey,
          name: metadata?.name ?? normalized.title ?? `Job ${jobKey}`,
          status: normalized.status,
          startedAt: normalized.startedAt,
          completedAt: normalized.completedAt,
          htmlUrl: metadata?.htmlUrl ?? null,
          failedSteps,
        };
      });
      const failedJob = jobs.find((job) => job.status === "failed") ?? null;
      const failedSteps = failedJob?.failedSteps ?? [];
      const latestLog = logLookup.get(run.id) ?? null;

      return {
        id: run.id,
        repository: deployment?.repository_full_name ?? "unknown/repo",
        workflow: run.workflow_name ?? "Deploy",
        environment,
        branch: run.branch ?? "main",
        commit: run.commit_sha?.slice(0, 7) ?? "unknown",
        status,
        duration: formatDuration(startedAt, completedAt),
        triggeredBy: run.actor ?? "system",
        completedAt: completedAt ?? startedAt ?? "",
        startedAt: startedAt ?? completedAt ?? "",
        timeline: buildTimeline(events),
        jobs,
        failureDetails:
          status === "Failed"
            ? {
              jobId: failedJob?.id ?? null,
              failedJob: failedJob?.name ?? "Unknown",
              failedStep: failedSteps[0]?.name ?? "Unknown",
              failedSteps,
              logsStoragePath: latestLog?.storage_path ?? null,
              htmlUrl: failedJob?.htmlUrl ?? run.html_url ?? null,
              incidentUrl: "#",
            }
            : null,
      };
    });
  }

  return deployments.map((deployment) => {
    const status = normalizeStatus(deployment.status);
    const events = eventLookup.get(deployment.workflow_run_id) ?? [];
    const jobEventGroups = new Map<string, WorkflowEventRow[]>();

    for (const event of events) {
      if (event.github_job_id == null) {
        continue;
      }

      const key = String(event.github_job_id);
      const current = jobEventGroups.get(key);

      if (current) {
        current.push(event);
      } else {
        jobEventGroups.set(key, [event]);
      }
    }

    const jobs = Array.from(jobEventGroups.entries()).map(([jobKey, jobEvents]) => {
      const metadata = jobMetadata.get(jobKey);
      const normalized = normalizeJobEvents(jobEvents);
      const stepJobId = metadata?.internalId;
      const steps = stepJobId ? (stepLookup.get(stepJobId) ?? []) : [];
      const failedSteps = steps
        .map((step) => ({
          name: step.step_name ?? "Unnamed step",
          status: step.conclusion === "failure" ? "failed" : (step.status ?? "queued"),
          conclusion: step.conclusion,
        }))
        .filter((step) => step.status === "failed" || step.conclusion === "failure");

      return {
        id: jobKey,
        name: metadata?.name ?? normalized.title ?? `Job ${jobKey}`,
        status: normalized.status,
        startedAt: normalized.startedAt,
        completedAt: normalized.completedAt,
        htmlUrl: metadata?.htmlUrl ?? null,
        failedSteps,
      };
    });
    const failedJob = jobs.find((job) => job.status === "failed") ?? null;
    const failedSteps = failedJob?.failedSteps ?? [];

    const latestLog = logLookup.get(deployment.workflow_run_id) ?? null;

    return {
      id: deployment.id,
      repository: deployment.repository_full_name,
      workflow: "Deploy",
      environment: deployment.environment,
      branch: "main",
      commit: deployment.commit_sha.slice(0, 7),
      status,
      duration: formatDuration(deployment.created_at, deployment.updated_at),
      triggeredBy: "system",
      completedAt: deployment.updated_at,
      startedAt: deployment.created_at,
      timeline: buildTimeline(events),
      jobs,
      failureDetails:
        status === "Failed"
          ? {
            jobId: failedJob?.id ?? null,
            failedJob: failedJob?.name ?? "Unknown",
            failedStep: failedSteps[0]?.name ?? "Unknown",
            failedSteps,
            logsStoragePath: latestLog?.storage_path ?? null,
            htmlUrl: failedJob?.htmlUrl ?? null,
            incidentUrl: "#",
          }
          : null,
    };
  });
}

const STAT_TONE_CLASSES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600",
  emerald: "bg-emerald-100 text-emerald-700",
  rose: "bg-rose-100 text-rose-700",
  sky: "bg-sky-100 text-sky-700",
};

const JOB_ICON_MAP = {
  completed: CheckCircle2,
  in_progress: LoaderCircle,
  queued: Clock3,
  failed: XCircle,
} as const;

const TIMELINE_ICON_MAP = {
  complete: CheckCircle2,
  current: LoaderCircle,
  pending: Clock3,
  failed: XCircle,
} as const;

export function DeploymentsFeed() {
  const supabase = useMemo(() => createClient(), []);
  const params = useParams<{ teamId?: string }>();
  const teamId = params?.teamId;
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedFailureJobId, setSelectedFailureJobId] = useState<string | null>(null);
    const [signedLogUrl, setSignedLogUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
      // console.log("Selected Run:", selectedRun);

    async function loadRuns() {
      const workflowQuery = supabase.from("workflow_runs").select("id,workflow_name,branch,commit_sha,actor,status,conclusion,started_at,completed_at,created_at,duration_ms,html_url").eq("team_id", teamId).order("created_at", { ascending: false }).limit(20);
      const deploymentQuery = supabase.from("deployments").select("id,repository_full_name,commit_sha,environment, status, created_at , updated_at,workflow_run_id").eq("team_id", teamId).order("created_at", { ascending: false }).limit(20);
      const workflowEvent = supabase.from("workflow_events").select("*").eq("team_id", teamId).order("created_at", { ascending: true });
      const workflowLogsQuery = supabase.from("workflow_logs").select("*").eq("team_id", teamId).order("created_at", { ascending: false });
      // const workflowJobsQuery = supabase.from("workflow_jobs").select("*").eq("team_id", teamId);
      // const workflowStepsQuery = supabase.from("workflow_steps").select("*").eq("team_id", teamId);

      // 1
      const workflowResult = await workflowQuery;
      const deploymentResult = await deploymentQuery;
      const workflowEventResult = await workflowEvent;
      const workflowLogsResult = await workflowLogsQuery;

      // 2
      const workflowRunIds =
        (workflowResult.data ?? []).map(r => r.id);

      const workflowJobsResult =
        workflowRunIds.length
          ? await supabase
            .from("workflow_jobs")
            .select("*")
            .in("workflow_run_id", workflowRunIds)
          : { data: [], error: null };

      // 3
      const jobIds =
        (workflowJobsResult.data ?? []).map(j => j.id);

      const workflowStepsResult =
        jobIds.length
          ? await supabase
            .from("workflow_steps")
            .select("*")
            .in("workflow_job_id", jobIds)
          : { data: [], error: null };

      if (!isMounted) {
        return;
      }

      const workflowRuns = (workflowResult.data ?? []) as WorkflowRunRow[];
      const deployments = (deploymentResult.data ?? []) as DeploymentRow[];
      const workflowEvents = (workflowEventResult.data ?? []) as WorkflowEventRow[];
      const workflowJobs = (workflowJobsResult.data ?? []) as WorkflowJobRow[];
      const workflowSteps = (workflowStepsResult.data ?? []) as WorkflowStepRow[];
      const workflowLogs = (workflowLogsResult.data ?? []) as WorkflowLogRow[];

      for (const [name, result] of [
        ["workflow_runs", workflowResult],
        ["deployments", deploymentResult],
        ["workflow_events", workflowEventResult],
        ["workflow_jobs", workflowJobsResult],
        ["workflow_steps", workflowStepsResult],
        ["workflow_logs", workflowLogsResult],
      ] as const) {
        if (result.error) {
          console.error(`${name} query failed`, result.error);
        }
      }

      const nextRuns = mapWorkflowRuns(workflowRuns, deployments, workflowEvents, workflowJobs, workflowSteps, workflowLogs);

      console.log("Next Runs", nextRuns); 
      console.log("Next Runs[0].failureDetails]", nextRuns[0].failureDetails); 

      setRuns(nextRuns);
      setSelectedRunId((current) => current ?? nextRuns[0]?.id ?? null);
      setSelectedFailureJobId((current) => current ?? nextRuns.find((run) => run.jobs.some((job) => job.status === "failed"))?.jobs.find((job) => job.status === "failed")?.id ?? null);
      setIsLoading(false);
    }

    void loadRuns();

    const channel = supabase
      .channel("ci-cd-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "workflow_runs", filter: `team_id=eq.${teamId}` }, () => {
        void loadRuns();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "deployments", filter: `team_id=eq.${teamId}` }, () => {
        void loadRuns();
      })
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase, teamId]);

  const selectedRun = useMemo(() => runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null, [runs, selectedRunId]);

    console.log("Selected Run:", selectedRun);

  const selectedFailureJob = useMemo(() => {
    if (!selectedRun) {
      return null;
    }

    return (
      selectedRun.jobs.find((job) => job.id === selectedFailureJobId && job.status === "failed") ??
      selectedRun.jobs.find((job) => job.status === "failed") ??
      null
    );
  }, [selectedFailureJobId, selectedRun]);



//   useEffect(() => {
//     let isMounted = true;
    
//      console.log("Selected Run under the fetch url:", selectedRun);

//   if (!selectedRun) return;

//   console.log(
//     "Storage Path:",
//     selectedRun.failureDetails?.logsStoragePath
//   );

  
  

// async function fetchSignedLogUrl() {
//   const storagePath = selectedRun?.failureDetails?.logsStoragePath;

//   //  const { data: storage, error:storageError } = await supabase.storage
//   // .from("sentinel_logs")
//   // .list(`workflow-logs/${teamId}`);

// // console.log(storage);
// // console.log("Storage Error:",storageError);

// // const response = await fetch(`/api/incident/a725aa18-257f-4040-917a-e02e6d9b7e11/logs`);
// // const { url } = await response.json();

// // console.log(url);

// //   console.log("Bucket:", "sentinel_logs");
// // console.log("Path:", storagePath);

//   if (!storagePath) {
//     console.log("No logsStoragePath found");
//     setSignedLogUrl(null);
//     return;
//   }

//   const { data, error } = await supabase.storage
//     .from("sentinel_logs")
//     .createSignedUrl(storagePath, 60);

//   if (error) {
//     console.error(error);
//     setSignedLogUrl(null);
//     return;
//   }

//   setSignedLogUrl(data.signedUrl);
// }

//     void fetchSignedLogUrl();

//     return () => {
//       isMounted = false;
//     };
//   }, [selectedRun, supabase]);

  const stats = useMemo(() => {
    const totals = {
      total: runs.length,
      successful: runs.filter((run) => run.status === "Success").length,
      failed: runs.filter((run) => run.status === "Failed").length,
      running: runs.filter((run) => run.status === "Running").length,
    };

    return [
      { label: "Total Deployments", value: totals.total.toString(), icon: Rocket, tone: "slate" },
      { label: "Successful", value: totals.successful.toString(), icon: CheckCircle2, tone: "emerald" },
      { label: "Failed", value: totals.failed.toString(), icon: XCircle, tone: "rose" },
      { label: "Running", value: totals.running.toString(), icon: LoaderCircle, tone: "sky" },
    ];
  }, [runs]);

  return (
    <>
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <Card key={item.label} className="rounded-xl">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-1 text-2xl font-semibold">{item.value}</p>
                  </div>
                  <div className={`flex size-10 items-center justify-center rounded-full ${STAT_TONE_CLASSES[item.tone]}`}>
                    <Icon className="size-5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_1.35fr]">
          <Card className="rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pipeline history</CardTitle>
                <p className="mt-1 text-sm text-slate-500">Latest builds, tests, and releases for this team.</p>
              </div>
              <Badge variant="outline" className="gap-1">
                <Radio className="size-3" />
                Live
              </Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Loading CI/CD activity...
                </div>
              ) : runs.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  No pipeline runs have been captured yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Repository</TableHead>
                        <TableHead>Workflow</TableHead>
                        <TableHead>Environment</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Commit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Triggered By</TableHead>
                        <TableHead>Completed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {runs.map((run) => {
                        const isSelected = selectedRun?.id === run.id;

                        return (
                          <TableRow
                            key={run.id}
                            className={`cursor-pointer hover:bg-slate-50 ${isSelected ? "bg-slate-50" : ""}`}
                            onClick={() => setSelectedRunId(run.id)}
                          >
                            <TableCell className="font-medium">{run.repository}</TableCell>
                            <TableCell>{run.workflow}</TableCell>
                            <TableCell>{run.environment}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-slate-600">
                                <GitBranch className="size-3" />
                                {run.branch}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-slate-600">
                                <GitCommitHorizontal className="size-3" />
                                {run.commit}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusVariant(run.status)}>{run.status}</Badge>
                            </TableCell>
                            <TableCell>{run.duration}</TableCell>
                            <TableCell>{run.triggeredBy}</TableCell>
                            <TableCell>{formatDateTime(run.completedAt)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl">
            <CardHeader>
              <CardTitle>Deployment timeline</CardTitle>
              <p className="mt-1 text-sm text-slate-500">The selected pipeline run is highlighted below.</p>
            </CardHeader>
            <CardContent className="space-y-5">
              {selectedRun ? (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{selectedRun.repository}</p>
                        <p className="text-sm text-slate-500">{selectedRun.workflow} • {selectedRun.environment}</p>
                      </div>
                      <Badge variant={statusVariant(selectedRun.status)}>{selectedRun.status}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <GitBranch className="size-3" />
                        {selectedRun.branch}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="size-3" />
                        {selectedRun.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="size-3" />
                        {selectedRun.triggeredBy}
                      </span>
                    </div>
                  </div>

                  <div>
                    {selectedRun.timeline.map((step, index) => {
                      const isLast = index === selectedRun.timeline.length - 1;
                      const Icon = TIMELINE_ICON_MAP[step.status];
                      const isCurrent = step.status === "current";
                      const isFailed = step.status === "failed";
                      const isPending = step.status === "pending";

                      return (
                        <div key={`${step.label}-${index}`} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full ${isFailed
                                ? "bg-rose-100 text-rose-700"
                                : isCurrent
                                  ? "bg-sky-100 text-sky-700"
                                  : isPending
                                    ? "bg-slate-100 text-slate-500"
                                    : "bg-emerald-100 text-emerald-700"
                                }`}
                            >
                              <Icon className="size-3.5" />
                            </div>
                            {!isLast ? <div className="my-1 w-px flex-1 bg-slate-200" /> : null}
                          </div>
                          <div className="flex-1 rounded-md border border-slate-200 p-3 pb-3.5" style={{ marginBottom: isLast ? 0 : 12 }}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium">{step.label}</p>
                              <span className="text-xs text-slate-500">{formatDateTime(step.time)}</span>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">Jobs</p>
                        <p className="text-sm text-slate-500">Lifecycle for this pipeline run</p>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {selectedRun.jobs.map((job) => {
                        const JobIcon = JOB_ICON_MAP[job.status];
                        const isFailed = job.status === "failed";
                        const isExpanded = isFailed && selectedFailureJobId === job.id;

                        return (
                          <div
                            key={job.id}
                            className={`rounded-md border bg-white transition-colors ${isFailed ? "border-rose-200" : "border-slate-200"
                              }`}
                          >
                            <button
                              type="button"
                              disabled={!isFailed}
                              onClick={() => isFailed && setSelectedFailureJobId(isExpanded ? null : job.id)}
                              className={`flex w-full items-center justify-between gap-3 p-3 text-left ${isFailed ? "cursor-pointer" : "cursor-default"
                                }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`flex size-7 items-center justify-center rounded-full ${isFailed
                                    ? "bg-rose-100 text-rose-700"
                                    : job.status === "completed"
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                    }`}
                                >
                                  <JobIcon className="size-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{job.name}</p>
                                  <p className="text-xs capitalize text-slate-500">{job.status.replace("_", " ")}</p>
                                </div>
                              </div>
                              {isFailed ? (
                                <Badge variant="destructive" className="gap-1">
                                  <AlertCircle className="size-3" />
                                  {isExpanded ? "Hide details" : "View details"}
                                </Badge>
                              ) : null}
                            </button>

                            {isExpanded ? (
                              <div className="border-t border-rose-100 bg-rose-50/40 p-3">
                                <div className="mb-3 flex items-center justify-between gap-2">
                                  <p className="text-sm font-semibold text-rose-700">Failed job details</p>
                                  {job.failedSteps.length > 0 ? (
                                    <Badge variant="outline" className="border-rose-200 text-rose-700">
                                      {job.failedSteps.length} step{job.failedSteps.length > 1 ? "s" : ""} failed
                                    </Badge>
                                  ) : null}
                                </div>

                                {job.failedSteps.length > 0 ? (
                                  <div className="rounded-md border border-rose-200 bg-white p-3">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Failed steps
                                    </p>
                                    <ul className="space-y-1.5 text-sm text-slate-700">
                                      {job.failedSteps.map((step, index) => (
                                        <li key={`${step.name}-${index}`} className="flex items-center gap-2">
                                          <XCircle className="size-3.5 shrink-0 text-rose-600" />
                                          <span>{step.name}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ) : (
                                  <p className="rounded-md border border-dashed border-rose-200 bg-white p-3 text-sm text-slate-600">
                                    No failed step detail is available.
                                  </p>
                                )}

                                <div className="mt-3 flex flex-wrap gap-2">
                                  {/* <Button size="sm" className="gap-1.5" asChild>
                                    <a href={signedLogUrl ?? job.htmlUrl ?? "#"} target="_blank" rel="noreferrer">
                                      <TerminalSquare className="size-3.5" />
                                      View ZIP logs
                                    </a>
                                  </Button> */}
                                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                                    <a href={job.htmlUrl ?? "#"} target="_blank" rel="noreferrer">
                                      <ExternalLink className="size-3.5" />
                                      Open GitHub Job
                                    </a>
                                  </Button>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {!selectedRun.jobs.some((job) => job.status === "failed") ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <p className="font-semibold">This deployment completed without failures.</p>
                      </div>
                      <p className="mt-1">You can still open the logs or incident view for the run later.</p>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                  Select a pipeline run to inspect it.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}