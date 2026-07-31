"use client";

import { useState } from "react";
import { CheckCircle2, FolderGit2, Loader2, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";


type RepositoryOption = {
  full_name: string;
  default_branch?: string | null;
};

type CreateTeamActionProps = {
  initialName: string;
  repositories: RepositoryOption[];
  installUrl: string;
  installationId: string;
};

export function CreateTeamAction({ initialName, repositories, installUrl, installationId }: CreateTeamActionProps) {
  const router = useRouter();
  const supabase = createClient();


  const [isOpen, setIsOpen] = useState(false);
  const [teamName, setTeamName] = useState(initialName);
  const [showAllRepos, setShowAllRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(repositories[0]?.full_name ?? null);
  const [isPending, setIsPending] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);



  const visibleRepositories = showAllRepos ? repositories : repositories.slice(0, 5);
  const hasMoreRepos = repositories.length > 5;

  const openSidebar = () => {
    setTeamName(initialName);
    setShowAllRepos(false);
    setSelectedRepo(repositories[0]?.full_name ?? null);
    setIsOpen(true);
  };

  const closeSidebar = () => {

    setIsOpen(false);
  }

  const handleCreateTeam = async () => {
    if (!teamName || !selectedRepo) return;

    setSlugError(null);
    if (!teamName || !selectedRepo) return;


    setIsPending(true);
    try {
      const slug = teamName.toLowerCase().trim().replace(/\s+/g, "-");


      const { data: existingTeam } = await supabase
        .from("teams")
        .select("slug")
        .eq("slug", slug)
        .maybeSingle();

      if (existingTeam) {
        setSlugError("A team with this URL name already exists. Try a different name.");
        setIsPending(false);
        return;
      }

      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not found");

      // 2. Create the Team
      // Note: slug is generated from name, github_installation_id left null or handled by your webhook logic

      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          slug: teamName.toLowerCase().replace(/\s+/g, "-"),
          github_installation_id: installationId,
          repository_name: selectedRepo,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // 3. Create the Membership (Current user as owner)
      const { error: memberError } = await supabase
        .from("memberships")
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: "owner", // Using the role specified in your schema
        });

      if (memberError) throw memberError;

      // 4. Create the Repository entry
      const selectedRepoMetadata = repositories.find(r => r.full_name === selectedRepo);
      const { error: repoError } = await supabase
        .from("repositories")
        .insert({
          team_id: team.id,
          full_name: selectedRepo,
          name: selectedRepo.split("/").pop(), // Extract 'repo' from 'owner/repo'
          default_branch: selectedRepoMetadata?.default_branch ?? "main",
          provider: "github",
        });

      if (repoError) throw repoError;

      // Success logic
      router.refresh();
      setIsOpen(false);
    } catch (error) {
      console.error("Error creating team:", error);
      alert("Failed to create team. Please try again.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <Button size="lg" onClick={openSidebar} className="w-full sm:w-auto">
        <Plus className="size-4" />
        Create team
      </Button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 px-0 py-0" onClick={closeSidebar}>
          <aside
            className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">Create team</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">Start a new team</h2>
              </div>
              <button
                type="button"
                onClick={closeSidebar}
                className="rounded-md p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Close create team sidebar"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700" htmlFor="team-name">
                    Team name
                  </label>
                  <Input
                    id="team-name"
                    value={teamName}
                    onChange={(event) => {
                      setTeamName(event.target.value);
                      if (slugError) setSlugError(null); // Clear error while typing
                    }}

                    placeholder="Acme Platform"
                  />
                  {/* URL Preview */}
                  <p className="text-[11px] font-mono text-slate-400">
                    URL Slug: /{teamName.toLowerCase().trim().replace(/\s+/g, "-")}
                  </p>

                  {/* Error Message */}
                  {slugError ? (
                    <p className="text-sm font-medium text-red-600">{slugError}</p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      Pick a clear name for the workspace.
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-800">Repositories</p>
                      <p className="text-sm text-slate-500">Choose one repo to connect to this team.</p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <a href={installUrl}>Import repositories</a>
                    </Button>
                  </div>

                  <label className="relative mt-4 block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input className="pl-9" placeholder="Search repositories" />
                  </label>

                  <div className="mt-4 space-y-2">
                    {visibleRepositories.length ? (
                      visibleRepositories.map((repository) => {
                        const isSelected = selectedRepo === repository.full_name;

                        return (
                          <label
                            key={repository.full_name}
                            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition ${isSelected ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
                              }`}
                          >
                            <input
                              className="mt-1"
                              type="radio"
                              name="repository"
                              checked={isSelected}
                              onChange={() => setSelectedRepo(repository.full_name)}
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-900">{repository.full_name}</span>
                              <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                                <FolderGit2 className="size-3.5" />
                                {repository.default_branch ? `Default branch: ${repository.default_branch}` : "Repository ready"}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
                        No repositories are available yet. Import repositories to continue.
                      </div>
                    )}
                  </div>

                  {hasMoreRepos ? (
                    <Button type="button" variant="ghost" className="mt-3 w-full" onClick={() => setShowAllRepos((value) => !value)}>
                      {showAllRepos ? "Show less" : "See all repositories"}
                    </Button>
                  ) : null}
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" />
                    <div>
                      <p className="text-sm font-medium text-emerald-800">Ready to create this team</p>
                      <p className="mt-1 text-sm text-emerald-700">
                        Review the team name and repository choice, then create the workspace when you are ready.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
              <Button type="button" variant="outline" onClick={closeSidebar}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreateTeam} disabled={isPending || !teamName}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}

                Create team
              </Button>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
