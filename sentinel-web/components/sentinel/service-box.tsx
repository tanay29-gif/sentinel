'use client'
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StatusBar } from "./status-bar";

export function ServiceCard({ serviceName, uptime, history, status, lastLatency, lastErrorRate}: { serviceName: string; uptime: number; history: any[]; status: string; lastLatency: number; lastErrorRate: string }) {


  if (!serviceName) return <div className="h-32 animate-pulse bg-slate-100 rounded-md" />;

  // Get current status from the very last data point

  
  return (
    <div className="group cursor-pointer rounded-md border border-slate-200 p-4 hover:border-blue-400 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-slate-900">{serviceName}</p>
        <Badge 
          className={
            status === "operational" ? "bg-emerald-100 text-emerald-700" :
            status === "warning" ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
          }
          variant="outline"
        >
          {status === "operational" ? "Healthy" : status === "warning" ? "Degraded" : "Down"}
        </Badge>
      </div>

      <StatusBar history={history} />

      <div className="mt-3 grid grid-cols-3 text-[12px] font-medium text-slate-500">
        <span>{uptime}% uptime</span>
        {/* We take the last known values for real-time display */}
        <span>{lastLatency}ms p95</span> 
        <span>{lastErrorRate}% errors</span>
      </div>
    </div>
  );
}