import Link from "next/link";
import { redirect } from "next/navigation";
import {  Building2, CheckCircle2, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GitHubIcon } from "@/components/assests/github_icon";
import { createClient } from "@/lib/supabase/server";
import { TeamList } from "@/components/sentinel/list_team";
import {createTeam} from "@/app/action";
import { fetchInstalledRepositories } from "@/lib/github-sync";

type SearchParams = Promise<{
  create?: string;
  created?: string;
  error?: string;
  installation_id?: string;
  setup?: string;
  warning?: string;
}>;

type TeamRow = {
  team_id: string;
  role: string;
  teams:
  | {
    id: string;
    name: string;
    slug: string;
    github_installation_id: string | null;
    created_at: string;
  }
  | {
    id: string;
    name: string;
    slug: string;
    github_installation_id: string | null;
    created_at: string;
  }[]
  | null;
};

type TeamCard = {
  id: string;
  name: string;
  slug: string;
  github_installation_id: string | null;
  created_at: string;
  role: string;
  team_id: string;
};

const errorCopy: Record<string, string> = {
  "missing-team-fields": "Team name is required.",
  "missing-installation": "Install the GitHub App before creating the team.",
  "missing-repository": "Choose one repository for this team.",
  "repository-not-installed": "That repository is not part of this GitHub installation.",
  "repository-already-used": "That repository is already connected to another team.",
  "slug-taken": "A team with that name already exists. Try a more specific name.",
  "team-create-failed": "Could not create the team. Try again.",
  "membership-create-failed": "Team was created, but owner membership failed.",
  "installation-save-failed": "Could not save the GitHub installation. Try again.",
};

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  if (!user.user_metadata?.onboarding_completed) {
    redirect("/sign-up");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("github_installation_id")
    .eq("id", user.id)
    .single();

  const params = await searchParams;
 const installationId = params.installation_id || profile?.github_installation_id || "";
  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "sentinal-github";
  const installUrl = new URL(`https://github.com/apps/${githubAppSlug}/installations/new`);
  installUrl.searchParams.set("state", "create-team");
  const installedRepositories = installationId ? await fetchInstalledRepositories(installationId) : [];

  const { data: memberships } = await supabase
    .from("memberships")
    .select("team_id, role, teams(id, name, slug, github_installation_id, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const teams = ((memberships ?? []) as TeamRow[])
    .map((membership) => {
      const team = Array.isArray(membership.teams) ? membership.teams[0] : membership.teams;
      return team ? { ...team, role: membership.role, team_id: membership.team_id } : null;
    })
    .filter((team): team is TeamCard => Boolean(team));

  const message = params.error ? errorCopy[params.error] : null;
  const suggestedName =
    installedRepositories[0]?.name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.user_name ||
    user.email?.split("@")[0] ||
    "My Team";

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-8 text-slate-950">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-4 flex size-11 items-center justify-center rounded-md bg-emerald-600 text-white">
              <ShieldCheck className="size-5" />
            </div>
            <h1 className="text-3xl font-semibold tracking-normal">Sentinel teams</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Choose a team to open its dashboard, or create a new team after installing the GitHub App for repository
              access.
            </p>
          </div>

          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/?create=1">
              <Plus className="size-4" />
              Create team
            </Link>
          </Button>
        </header>

        {params.create || installationId || message ? (
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle>New team</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createTeam} className="space-y-4">
                <input type="hidden" name="installation_id" value={installationId} />

                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <label className="block space-y-2 text-sm font-medium text-slate-700">
                    <span>Team name</span>
                    <Input name="name" required defaultValue={suggestedName} placeholder="Acme Platform" />
                  </label>

                  <Button asChild variant={installationId ? "outline" : "default"} size="lg" className="w-full lg:w-auto">
                    <a href={installUrl.toString()}>
                      <span className="[&_svg]:size-4">
                        <GitHubIcon />
                      </span>
                      {installationId ? "GitHub installed" : "Install GitHub App"}
                    </a>
                  </Button>
                </div>

                {installationId ? (
                  <fieldset className="space-y-3">
                    <legend className="text-sm font-medium text-slate-700">Repository for this team</legend>
                    <div className="grid gap-2 md:grid-cols-2">
                      {installedRepositories.map((repository, index) => (
                        <label
                          key={repository.full_name}
                          className="flex cursor-pointer items-start gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm transition-all has-[:checked]:border-emerald-500 has-[:checked]:bg-emerald-50"
                        >
                          <input
                            className="mt-1"
                            type="radio"
                            name="repo_full_name"
                            value={repository.full_name}
                            required
                            defaultChecked={index === 0}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-slate-900">{repository.full_name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              Default branch: {repository.default_branch ?? "main"}
                            </span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {!installedRepositories.length ? (
                      <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                        No repositories were returned by this installation. Reinstall the GitHub App and choose a repo.
                      </p>
                    ) : null}
                  </fieldset>
                ) : null}

                <Button className="w-full lg:w-auto" size="lg" type="submit" disabled={!installationId || !installedRepositories.length}>
                  <Building2 className="size-4" />
                  Create team
                </Button>
              </form>

              <div className="mt-4 space-y-2">
                {installationId ? (
                  <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    <CheckCircle2 className="size-4" />
                    GitHub installation complete. Create the team to finish setup.
                  </p>
                ) : null}
                {message ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}
                {params.warning === "sync-failed" ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    Team created, but the first repository sync did not finish. Open the dashboard and retry later.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : null}

         <TeamList teams={teams} createdId={params.created} />
      </section>
    </main>
  );
}
