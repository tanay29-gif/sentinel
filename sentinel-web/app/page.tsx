import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";
import { GitHubIcon } from "@/components/assests/github_icon";

function slugify(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function createTeam(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(formData.get("slug") || name);
  const slackWorkspaceId = String(formData.get("slack_workspace_id") ?? "").trim() || null;

  if (!name || !slug) {
    redirect("/?error=missing-team-fields");
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      slug,
      slack_workspace_id: slackWorkspaceId,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    const reason = teamError?.code === "23505" ? "slug-taken" : "team-create-failed";
    redirect(`/?error=${reason}`);
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    team_id: team.id,
    user_id: user.id,
    role: "owner",
  });

  if (membershipError) {
    redirect("/?error=membership-create-failed");
  }

  redirect(`/installation?team_id=${team.id}`);
}

type SearchParams = Promise<{ error?: string }>;

const errorCopy: Record<string, string> = {
  "missing-team-fields": "Team name and slug are required.",
  "slug-taken": "That team slug is already taken.",
  "team-create-failed": "Could not create the team. Try again.",
  "membership-create-failed": "Team was created, but owner membership failed.",
};

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("team_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membership?.team_id) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const message = params.error ? errorCopy[params.error] : null;
  const suggestedName =
    user.user_metadata?.full_name || user.user_metadata?.user_name || user.email?.split("@")[0] || "My Team";
  const suggestedSlug = slugify(suggestedName);

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-10">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] w-full max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="mb-5 flex size-11 items-center justify-center rounded-md bg-emerald-600 text-white">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="text-4xl font-semibold tracking-normal text-slate-950">Create your Sentinel team</h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
            Set up the workspace that will own your incidents, repositories, branches, commits, and GitHub App
            installation.
          </p>
          <div className="mt-6 grid gap-3 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-emerald-700" />
              Team rows are created from this form.
            </div>
            <div className="flex items-center gap-2">
              <span className="flex size-4 items-center justify-center text-emerald-700 [&_svg]:size-4">
                <GitHubIcon />
              </span>
              GitHub repository access is connected immediately after.
            </div>
          </div>
        </div>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle>Team details</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createTeam} className="space-y-4">
              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Team name</span>
                <Input name="name" required defaultValue={suggestedName} placeholder="Acme Platform" />
              </label>

              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Team slug</span>
                <Input name="slug" required defaultValue={suggestedSlug} placeholder="acme-platform" pattern="[a-z0-9-]+" />
              </label>

              <label className="block space-y-2 text-sm font-medium text-slate-700">
                <span>Slack workspace ID</span>
                <Input name="slack_workspace_id" placeholder="Optional" />
              </label>

              {message ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p> : null}

              <Button className="w-full" size="lg" type="submit">
                <Building2 className="size-4" />
                Create team
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
