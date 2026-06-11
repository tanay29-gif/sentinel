const DEFAULT_TEAM_SLUG = "github-actions";
const DEFAULT_TEAM_NAME = "GitHub Actions";
const DEFAULT_REPO = "unknown/repo";
const DEFAULT_COMMIT = "unknown";
const DEFAULT_ENVIRONMENT = "production";

function firstValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0)?.trim();
}

function classifyLevel(message) {
  const value = message.toLowerCase();

  if (/\b(error|failed|failure|fatal|exception)\b/.test(value)) {
    return "ERROR";
  }

  if (/\b(warn|warning|deprecated)\b/.test(value)) {
    return "WARN";
  }

  return "INFO";
}

function classifyDeploymentStatus(message) {
  const value = message.toLowerCase();

  if (/\b(error|failed|failure|fatal)\b/.test(value)) {
    return "failure";
  }

  if (/\b(done|success|successful|succeeded|compiled successfully|build complete)\b/.test(value)) {
    return "success";
  }

  return "in_progress";
}

async function ensureTeam(supabase, teamId) {
  if (teamId) {
    return teamId;
  }

  const { data: existing, error: selectError } = await supabase
    .from("teams")
    .select("id")
    .eq("slug", DEFAULT_TEAM_SLUG)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({ name: DEFAULT_TEAM_NAME, slug: DEFAULT_TEAM_SLUG })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function findOrCreateService(supabase, teamId, serviceId, serviceName) {
  if (serviceId) {
    return serviceId;
  }

  if (!serviceName) {
    return null;
  }

  const { data: existing, error: selectError } = await supabase
    .from("services")
    .select("id")
    .eq("team_id", teamId)
    .eq("name", serviceName)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("services")
    .insert({ team_id: teamId, name: serviceName })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

async function findOrCreateDeployment(supabase, payload) {
  if (payload.deploymentId) {
    return payload.deploymentId;
  }

  const { data: existing, error: selectError } = await supabase
    .from("deployments")
    .select("id,status")
    .eq("team_id", payload.teamId)
    .eq("repo_full_name", payload.repo)
    .eq("commit_sha", payload.commitSha)
    .eq("environment", payload.environment)
    .order("deployed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existing?.id && existing.status !== payload.status) {
    const { error: updateError } = await supabase
      .from("deployments")
      .update({ status: payload.status, deployed_at: new Date().toISOString() })
      .eq("id", existing.id);

    if (updateError) {
      throw updateError;
    }

    return existing.id;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from("deployments")
    .insert({
      team_id: payload.teamId,
      service_id: payload.serviceId,
      provider: "github",
      repo_full_name: payload.repo,
      commit_sha: payload.commitSha,
      commit_message: payload.commitMessage,
      author_handle: payload.author,
      environment: payload.environment,
      status: payload.status,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

function createLogsController({ supabase }) {
  async function ingestLogLine(req, res) {
    if (!supabase) {
      return res.status(503).json({ error: "Supabase is not configured." });
    }

    const message =
      typeof req.body === "string" ? req.body.trim() : firstValue(req.body?.message, req.body?.line);

    if (!message) {
      return res.status(400).json({ error: "Log message is required." });
    }

    const teamId = await ensureTeam(
      supabase,
      firstValue(req.query.team_id, req.get("x-sentinel-team-id"), process.env.SENTINEL_TEAM_ID)
    );
    const serviceId = await findOrCreateService(
      supabase,
      teamId,
      firstValue(req.query.service_id, req.get("x-sentinel-service-id")),
      firstValue(req.query.service, req.get("x-sentinel-service"), process.env.SENTINEL_SERVICE_NAME)
    );
    const repo = firstValue(req.query.repo, req.get("x-github-repository"), process.env.GITHUB_REPOSITORY) || DEFAULT_REPO;
    const commitSha =
      firstValue(req.query.commit_sha, req.get("x-github-sha"), process.env.GITHUB_SHA) || DEFAULT_COMMIT;
    const status = classifyDeploymentStatus(message);
    const deploymentId = await findOrCreateDeployment(supabase, {
      teamId,
      serviceId,
      deploymentId: firstValue(req.query.deployment_id, req.get("x-sentinel-deployment-id")),
      repo,
      commitSha,
      commitMessage: firstValue(req.query.commit_message, req.get("x-github-commit-message")),
      author: firstValue(req.query.author, req.get("x-github-actor"), process.env.GITHUB_ACTOR),
      environment:
        firstValue(req.query.environment, req.get("x-sentinel-environment"), process.env.SENTINEL_ENVIRONMENT) ||
        DEFAULT_ENVIRONMENT,
      status,
    });

    const { data, error } = await supabase
      .from("logs")
      .insert({
        team_id: teamId,
        service_id: serviceId,
        deployment_id: deploymentId,
        run_id: firstValue(req.query.run_id, req.get("x-github-run-id"), process.env.GITHUB_RUN_ID),
        job_name: firstValue(req.query.job_name, req.get("x-github-job"), process.env.GITHUB_JOB),
        level: classifyLevel(message),
        message,
        metadata: {
          repo,
          commit_sha: commitSha,
          workflow: firstValue(req.query.workflow, req.get("x-github-workflow"), process.env.GITHUB_WORKFLOW),
          ref: firstValue(req.query.ref, req.get("x-github-ref"), process.env.GITHUB_REF),
          sender: req.ip,
        },
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ log: data });
  }

  return {
    ingestLogLine,
  };
}

module.exports = {
  createLogsController,
};
