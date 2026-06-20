"use client";

import Link from "next/link";
import { MoreVertical, Trash, ArrowRight, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { handleDelete } from "@/app/action"; // Import the server action

type TeamCard = {
  id: string;
  name: string;
  slug: string;
  github_installation_id: string | null;
  role: string;
};

export function TeamList({ teams, createdId }: { teams: TeamCard[]; createdId?: string }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/dashboard?team_id=${team.id}`}
          className="group relative rounded-md border border-slate-200 bg-white p-5 text-sm shadow-xs transition-all hover:border-emerald-300 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
                <Building2 className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold">{team.name}</h2>
                <p className="truncate text-slate-500">{team.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <ArrowRight className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-700" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <button className="flex size-8 items-center justify-center rounded-md hover:bg-slate-100">
                    <MoreVertical className="size-4 text-slate-500" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if(confirm("Are you sure?")) await handleDelete(team.id);
                    }}
                  >
                    <Trash className="mr-2 size-4" />
                    Delete Team
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="secondary">{team.role}</Badge>
            <Badge variant={team.github_installation_id ? "outline" : "destructive"}>
              {team.github_installation_id ? "GitHub connected" : "GitHub missing"}
            </Badge>
            {createdId === team.id ? <Badge variant="outline">Created now</Badge> : null}
          </div>
        </Link>
      ))}
    </section>
  );
}
