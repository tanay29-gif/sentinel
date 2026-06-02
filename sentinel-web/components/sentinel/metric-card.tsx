import type { LucideIcon } from "lucide-react";

export function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  tone = "slate",
}: {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "slate" | "red" | "amber" | "emerald";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <span className={`flex size-9 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}
