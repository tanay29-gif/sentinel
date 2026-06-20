"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { fetchInstalledRepositories, getWriteClient, syncInstallationData } from "@/lib/github-sync";

function slugify(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createTeam(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const name = String(formData.get("name") ?? "").trim();
  const installationId = String(formData.get("installation_id") ?? "").trim();
  const repoFullName = String(formData.get("repo_full_name") ?? "").trim();
  const slug = slugify(name);

  if (!name || !slug) {
    redirect("/?error=missing-team-fields");
  }

  if (!installationId) {
    redirect("/?error=missing-installation");
  }

  if (!repoFullName) {
    redirect(`/?error=missing-repository&installation_id=${encodeURIComponent(installationId)}`);
  }

  const installedRepositories = await fetchInstalledRepositories(installationId);
  const selectedRepository = installedRepositories.find((repository) => repository.full_name === repoFullName);

  if (!selectedRepository) {
    redirect(`/?error=repository-not-installed&installation_id=${encodeURIComponent(installationId)}`);
  }

  const writeClient = getWriteClient(supabase);
  const { data: existingRepository } = await writeClient
    .from("repositories")
    .select("id")
    .eq("full_name", repoFullName)
    .maybeSingle();

  if (existingRepository) {
    redirect(`/?error=repository-already-used&installation_id=${encodeURIComponent(installationId)}`);
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name,
      slug,
      github_installation_id: installationId,
    })
    .select("id")
    .single();

  if (teamError || !team) {
    const reason = teamError?.code === "23505" ? "slug-taken" : "team-create-failed";
    redirect(`/?error=${reason}&installation_id=${encodeURIComponent(installationId)}`);
  }

  const { error: membershipError } = await supabase.from("memberships").insert({
    team_id: team.id,
    user_id: user.id,
    role: "owner",
  });

  if (membershipError) {
    redirect("/?error=membership-create-failed");
  }

  try {
    await syncInstallationData(writeClient, team.id, installationId, repoFullName);
  } catch (error) {
    console.error("GitHub sync after team creation failed:", error);
    redirect(`/?created=${team.id}&warning=sync-failed`);
  }

  revalidatePath("/");
  redirect(`/?created=${team.id}`);
}




export async function handleDelete(teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  await supabase.from("teams").delete().eq("id", teamId);
  
  revalidatePath("/"); // This refreshes the page data

}
