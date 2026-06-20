import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWriteClient, syncInstallationData } from "@/lib/github-sync";

export async function GET(request: Request) {

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const baseUrl = `${protocol}://${host}`;

  const url = new URL(request.url);
  const installationId = url.searchParams.get("installation_id");
  const teamId = url.searchParams.get("state");

  console.log("url ", request.url);
  console.log("installationId ", installationId);
  console.log("teamId ", teamId);

  if (!installationId) {
    return NextResponse.redirect(new URL("/?error=missing-installation", baseUrl));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth", baseUrl));
  }

  if (teamId === "onboarding") {
    await supabase.auth.updateUser({
      data: {
        onboarding_completed: true,
      },
    });

    const redirectUrl = new URL("/", baseUrl);
    redirectUrl.searchParams.set("create", "1");
    redirectUrl.searchParams.set("installation_id", installationId);
    return NextResponse.redirect(redirectUrl);
  }

  if (!teamId || teamId === "create-team") {
    const redirectUrl = new URL("/", baseUrl);
    redirectUrl.searchParams.set("installation_id", installationId);
    redirectUrl.searchParams.set("setup", "complete");
    return NextResponse.redirect(redirectUrl);
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("role")
    .eq("team_id", teamId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.redirect(new URL("/", baseUrl));
  }

  const writeClient = getWriteClient(supabase);

  const { error: updateError } = await writeClient
    .from("teams")
    .update({ github_installation_id: installationId })
    .eq("id", teamId);

  if (updateError) {
    console.error("Failed to save GitHub installation:", updateError);
    return NextResponse.redirect(new URL("/?error=installation-save-failed", baseUrl));
  }

  await syncInstallationData(writeClient, teamId, installationId);

  return NextResponse.redirect(new URL(`/dashboard?team_id=${teamId}`, baseUrl));
}
