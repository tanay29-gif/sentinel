"use client";

import { useEffect, useMemo, useState } from "react";
import { Radio } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type LogRow = {
  id: string;
  level: "ERROR" | "WARN" | "INFO" | string;
  message: string;
  run_id: string | null;
  job_name: string | null;
  created_at: string;
  services: { name: string } | null;
};

type RawLogRow = Omit<LogRow, "services"> & {
  services: { name: string }[] | { name: string } | null;
};

function normalizeLogRow(log: RawLogRow): LogRow {
  const service = Array.isArray(log.services) ? log.services[0] : log.services;

  return {
    ...log,
    services: service ?? null,
  };
}

function levelClass(level: string) {
  if (level === "ERROR") {
    return "text-red-300";
  }

  if (level === "WARN") {
    return "text-amber-300";
  }

  return "text-emerald-300";
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LogStream() {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [filter, setFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);



  console.log("Rendering LogStream component with logs:", logs);
  useEffect(() => {
    let isMounted = true;

    async function loadLogs() {
      const { data } = await supabase
        .from("logs")
        .select("id,level,message,run_id,job_name,created_at,services(name)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (isMounted) {
        setLogs(((data ?? []) as RawLogRow[]).map(normalizeLogRow));
        setIsLoading(false);
      }
    }

    void loadLogs();

    const channel = supabase
      .channel("logs-stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "logs" },
        async (payload) => {
          const next = payload.new as Omit<LogRow, "services"> & { service_id: string | null };
          let serviceName: string | null = null;

          if (next.service_id) {
            const { data } = await supabase.from("services").select("name").eq("id", next.service_id).maybeSingle();
            serviceName = data?.name ?? null;
          }

          setLogs((current) =>
            [{ ...next, services: serviceName ? { name: serviceName } : null }, ...current].slice(0, 100)
          );
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [supabase]);

  const visibleLogs = logs.filter((log) => {
    const value = filter.trim().toLowerCase();

    if (!value) {
      return true;
    }

    return [log.level, log.message, log.services?.name, log.run_id, log.job_name]
      .filter(Boolean)
      .some((field) => field?.toLowerCase().includes(value));
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="rounded-md">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="service:checkout-api" value={filter} onChange={(event) => setFilter(event.target.value)} />
          {["ERROR", "WARN", "INFO", "build", "deploy"].map((item) => (
            <Badge key={item} variant="outline" className="mr-2">
              {item}
            </Badge>
          ))}
        </CardContent>
      </Card>
      <Card className="rounded-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Live Log Stream</CardTitle>
          <Badge variant="outline" className="gap-1">
            <Radio className="size-3" />
            Live
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-400">Loading logs...</div>
          ) : visibleLogs.length === 0 ? (
            <div className="rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-400">
              Waiting for GitHub Actions log lines.
            </div>
          ) : (
            visibleLogs.map((log) => (
              <div
                key={log.id}
                className="grid gap-2 rounded-md bg-slate-950 p-3 font-mono text-xs text-slate-100 md:grid-cols-[76px_90px_150px_1fr]"
              >
                <span className="text-slate-400">{formatTime(log.created_at)}</span>
                <span className={levelClass(log.level)}>{log.level}</span>
                <span className="truncate">{log.services?.name ?? log.job_name ?? "github-actions"}</span>
                <span className="min-w-0 break-words">{log.message}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
