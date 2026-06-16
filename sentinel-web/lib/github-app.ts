// lib/github-app.ts
import { Octokit } from "octokit";
import { createAppAuth } from "@octokit/auth-app";

export async function getInstallationClient(installationId: string) {
  return new Octokit({
    authStrategy: createAppAuth,
    auth: {
      appId: process.env.GITHUB_APP_ID!,
      privateKey: process.env.GITHUB_PRIVATE_KEY!.replace(/\\n/g, '\n'),
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