import { NextRequest, NextResponse } from "next/server";
import handleWorkflowRun from "@/lib/github/handler/workflowRun";
import handleWorkflowJob from "@/lib/github/handler/workflowJob";
import handleDeployment from "@/lib/github/handler/deployments";
import handlePullRequest from "@/lib/github/handler/pullRequest";
import handlePush from "@/lib/github/handler/push";
import crypto from "crypto";


export async function POST(req: NextRequest) {

    const rawBody = await req.text();

    // Read the signature header
    const signature = req.headers.get("x-hub-signature-256");

    const secret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!signature || !secret) {
        return NextResponse.json(
            { error: "Missing signature or secret" },
            { status: 401 }
        );
    }

    // Compute the expected signature
    const expectedSignature =
        "sha256=" +
        crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex");

    // Compare signatures
    if (signature !== expectedSignature) {
        return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
        );
    }
    console.log("Signature is valid");
    // Signature is valid
    // NOW parse the JSON
    const payload = JSON.parse(rawBody);

    // console.log("Payload is this", payload);


    const event = req.headers.get("x-github-event");
   console.log("Event is this", event);

  switch (event) {

    case "workflow_run":
      return handleWorkflowRun(payload)

    case "workflow_job":
      return handleWorkflowJob(payload)

    case "deployment_status":
      return handleDeployment(payload)

    case "pull_request":
      return handlePullRequest(payload)

    case "push":
      return handlePush(payload)

    default:
      return NextResponse.json({ ignored: true })
  }

}



// export async function POST(req: NextRequest) {
//   try {
//     const event = req.headers.get("x-github-event");

//     const payload = await req.json();

//     if (event !== "deployment_status") {
//       return NextResponse.json({
//         success: true,
//         message: "Ignored event",
//       });
//     }

//     const deployment = payload.deployment;
//     const deploymentStatus = payload.deployment_status;
//     const repository = payload.repository;

//     const { data: repositoryRecord, error: repositoryError } =
//       await supabaseAdmin
//         .from("repositories")
//         .select("id, team_id, service_id")
//         .eq("full_name", repository.full_name)
//         .eq("provider", "github")
//         .single();

//     if (repositoryError || !repositoryRecord) {
//       console.error("Repository not registered:", repository.full_name);

//       return NextResponse.json(
//         {
//           success: false,
//           message: "Repository not registered",
//         },
//         { status: 404 }
//       );
//     }

//     // Insert deployment
//     const { error } = await supabaseAdmin.from("deployments").insert({

//      repository_id: repositoryRecord.id,

//       team_id: repositoryRecord.team_id,

//       service_id: null,

//       provider: "github",

//       repo: repository.full_name,

//       commit_sha: deployment.sha,

//       environment: deployment.environment,

//       status: deploymentStatus.state,

//       deployed_at: new Date().toISOString(),

//       description: deploymentStatus.description,
//     });

//     if (error) throw error;

//     // Insert log
//     await supabaseAdmin.from("logs").insert({
//       repository_id: null,
//       service_id: null,
//       team_id: null,

//       level:
//         deploymentStatus.state === "success"
//           ? "INFO"
//           : deploymentStatus.state === "failure"
//             ? "ERROR"
//             : "WARN",

//       message: `Deployment ${deploymentStatus.state}`,

//       metadata: payload,
//     });

//     return NextResponse.json({
//       success: true,
//     });
//   } catch (err) {
//     console.error(err);

//     return NextResponse.json(
//       {
//         success: false,
//       },
//       { status: 500 }
//     );
//   }
// }