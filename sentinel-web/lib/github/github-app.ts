// lib/github-app.ts
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";
import type {WorkflowRun} from "@/lib/interface";

export async function getInstallationClient(installationId: string) {
     const appId = process.env.NEXT_PUBLIC_GITHUB_APP_ID;
  const privateKey = process.env.NEXT_PUBLIC_GITHUB_PRIVATE_KEY;

   if (!appId || !privateKey) {
    throw new Error(
      "Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY in environment variables."
    );
  }
  const formattedKey = privateKey.replace(/\\n/g, '\n').trim();

  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: appId,
      privateKey: formattedKey,
      installationId: installationId,
    },
  });

  
}

export async function fetchRepositories(installationId: string) {
  const octokit = await getInstallationClient(installationId);
  // This endpoint gets repos specific to the installation
  const { data } = await octokit.request("GET /installation/repositories");
  return data.repositories;
}