import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TeamList } from "@/components/sentinel/list_team";
import { CreateTeamAction } from "@/components/sentinel/create-team-sidebar";
import { fetchInstalledRepositories } from "@/lib/github/github-sync";

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

  const { data: registeredRepos } = await supabase
    .from("repositories")
    .select("full_name");

  // Create a Set of full_names for O(1) lookup
  const registeredRepoNames = new Set(registeredRepos?.map(r => r.full_name) || []);


  const params = await searchParams;
 const installationId = params.installation_id || profile?.github_installation_id || "";
  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "sentinal-github";
  const installUrl = new URL(`https://github.com/apps/${githubAppSlug}/installations/new`);
  installUrl.searchParams.set("state", "create-team");
  const installedRepositories = installationId ? await fetchInstalledRepositories(installationId) : [];

  const availableRepositories = installedRepositories.filter(
    (repo) => !registeredRepoNames.has(repo.full_name)
  );


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

          <CreateTeamAction initialName={suggestedName} repositories={availableRepositories} installUrl={installUrl.toString() } installationId={installationId}  />
        </header>

        <TeamList teams={teams} createdId={params.created} />
      </section>
    </main>
  );
}
