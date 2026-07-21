import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get("x-github-event");

    const payload = await req.json();

    if (event !== "deployment_status") {
      return NextResponse.json({
        success: true,
        message: "Ignored event",
      });
    }

    const deployment = payload.deployment;
    const deploymentStatus = payload.deployment_status;
    const repository = payload.repository;

    const { data: repositoryRecord, error: repositoryError } =
      await supabaseAdmin
        .from("repositories")
        .select("id, team_id, service_id")
        .eq("full_name", repository.full_name)
        .eq("provider", "github")
        .single();

    if (repositoryError || !repositoryRecord) {
      console.error("Repository not registered:", repository.full_name);

      return NextResponse.json(
        {
          success: false,
          message: "Repository not registered",
        },
        { status: 404 }
      );
    }

    // Insert deployment
    const { error } = await supabaseAdmin.from("deployments").insert({

     repository_id: repositoryRecord.id,

      team_id: repositoryRecord.team_id,

      service_id: null,

      provider: "github",

      repo: repository.full_name,

      commit_sha: deployment.sha,

      environment: deployment.environment,

      status: deploymentStatus.state,

      deployed_at: new Date().toISOString(),

      description: deploymentStatus.description,
    });

    if (error) throw error;

    // Insert log
    await supabaseAdmin.from("logs").insert({
      repository_id: null,
      service_id: null,
      team_id: null,

      level:
        deploymentStatus.state === "success"
          ? "INFO"
          : deploymentStatus.state === "failure"
            ? "ERROR"
            : "WARN",

      message: `Deployment ${deploymentStatus.state}`,

      metadata: payload,
    });

    return NextResponse.json({
      success: true,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
      },
      { status: 500 }
    );
  }
}