import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { GitHubIcon } from "@/components/assests/github_icon";

type SearchParams = Promise<{ team_id?: string }>;

export default async function InstallPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const teamId = params.team_id;

  if (!teamId) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, teams(name)")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    redirect("/");
  }

  const githubAppSlug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ?? "sentinal-github";
  const installUrl = new URL(`https://github.com/apps/${githubAppSlug}/installations/new`);
  installUrl.searchParams.set("state", teamId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md rounded-md shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-md bg-slate-950 text-white">
            <span className="[&_svg]:size-5">
              <GitHubIcon />
            </span>
          </div>
          <CardTitle>Install the GitHub App</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            Select the repositories Sentinel should watch. After GitHub returns, Sentinel will sync repositories,
            branches, recent commits, and workflow activity for your team.
          </p>
          <Button asChild className="w-full" size="lg">
            <a href={installUrl.toString()}>
              <span className="[&_svg]:size-4">
                <GitHubIcon />
              </span>
              Install GitHub App
            </a>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
