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
    // console.log("Signature is valid");
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
