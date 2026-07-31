'use client'
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBar } from "./status-bar";
import type { ServiceState } from "@/lib/interface";

const STATUS = {
  "operational": {
    text: "Healthy",
    className: "bg-emerald-100 text-emerald-700"
  },
  "warning": {
    text: "Warning",
    className: "bg-amber-100 text-amber-700"
  },
  "critical": {
    text: "Critical",
    className: "bg-rose-100 text-rose-700"
  },
  "offline": {
    text: "Offline",
    className: "bg-slate-300 text-slate-700"
  },
  "no-data": {
    text: "No Data",
    className: "bg-slate-100 text-slate-500"
  }
};


export function ServiceCard({ serviceName, uptime, history, status, lastLatency, lastErrorRate, requestRate }: { serviceName: string; uptime: number; history: any[]; status: ServiceState; lastLatency: number; lastErrorRate: string, requestRate: number }) {

  const badge = STATUS[status];

  if (!serviceName) return <div className="h-32 animate-pulse bg-slate-100 rounded-md" />;

  // Get current status from the very last data point


  return (
    <div className="group w-full rounded-lg border border-slate-200 p-5 hover:border-blue-400 transition-colors shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="flex-1 font-semibold text-slate-900 break-words">{serviceName}</p>
        <Badge
          className={badge.className}
          variant="outline"
        > {badge.text}
        </Badge>
      </div>

      <StatusBar history={history} />

      <div className="mt-4 grid grid-cols-4 gap-3 text-center">
        <div>
          <p className="text-base font-medium text-slate-900">
            {uptime}%
          </p>
          <p className="text-xs text-slate-500">
            Uptime
          </p>
        </div>

        <div>
          <p className="text-base font-medium text-slate-900">
            {lastLatency} ms
          </p>
          <p className="text-xs text-slate-500">
            P95
          </p>
        </div>

        <div>
          <p className="text-base font-medium text-slate-900">
            {lastErrorRate}%
          </p>
          <p className="text-xs text-slate-500">
            Errors
          </p>
        </div>

        <div>
          <p className="text-base font-medium text-slate-900">
            {requestRate.toFixed(2)}
          </p>
          <p className="text-xs text-slate-500">
            Req/s
          </p>
        </div>
      </div>
    </div>
  );
}