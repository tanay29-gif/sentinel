// components/status-bar.tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { DailyHistory } from "@/lib/interface";


const STATUS_COLORS = {
  operational: "bg-emerald-500",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
  offline: "bg-slate-500",
  "no-data": "bg-slate-200",
} as const;

export function StatusBar({ history }: { history: DailyHistory[] }) {
  // Ensure we have exactly 14 slots, filling empty ones if data is missing
  const segments = history.slice(-14);

  return (
    <TooltipProvider>
      <div className="flex gap-[2px] h-8 w-full">
        {segments.map((day, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div
                className={`flex-1 rounded-[2px] transition-opacity hover:opacity-80 ${STATUS_COLORS[day.status] ?? STATUS_COLORS["no-data"]}`}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs font-medium">
                {new Date(day.timestamp).toLocaleDateString()}: {day.status.toUpperCase()}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}