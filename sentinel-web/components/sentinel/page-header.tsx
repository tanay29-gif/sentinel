import { Button } from "@/components/ui/button";

export function PageHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow: string;
  action?: string;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-700">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      </div>
      {action ? <Button className="w-fit bg-slate-950 text-white hover:bg-slate-800">{action}</Button> : null}
    </div>
  );
}
