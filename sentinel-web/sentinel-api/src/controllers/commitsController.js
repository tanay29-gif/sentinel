function createCommitsController(_dependencies) {
  
  async function listCommits(_req, res) {
    // Placeholder for real GitHub API integration
    // Currently returns mock data - integrate with GitHub API when ready
    try {
      const mockCommits = [
        {
          id: "cm-1",
          repo: "sentinel/checkout-api",
          branch: "main",
          commit: "4f9c2a1",
          message: "fix: cache key regression",
          author: "Asha",
          time: "10m ago",
        },
        {
          id: "cm-2",
          repo: "sentinel/web",
          branch: "feature/dashboard",
          commit: "8bc44ef",
          message: "feat: add analytics dashboard",
          author: "Ishan",
          time: "1h ago",
        },
        {
          id: "cm-3",
          repo: "sentinel/billing-worker",
          branch: "main",
          commit: "1d9ab30",
          message: "chore: update dependencies",
          author: "Rohan",
          time: "2h ago",
        },
        {
          id: "cm-4",
          repo: "sentinel/search",
          branch: "fix/memory-leak",
          commit: "7a41dd2",
          message: "fix: throttle index compaction",
          author: "Meera",
          time: "Yesterday",
        },
      ];
      res.json({ commits: mockCommits });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  }

  async function getRepositories(_req, res) {
    try {
      const mockRepos = ["sentinel/web", "sentinel/checkout-api", "sentinel/billing-worker", "sentinel/search"];
      res.json({ repos: mockRepos });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  }

  async function getBranches(req, res) {
    const { repo } = req.params;
    if (!repo) {
      return res.status(400).json({ error: "Repository name is required" });
    }

    try {
      const mockBranches = [
        { name: "main", repo, lastCommit: "4f9c2a1" },
        { name: "develop", repo, lastCommit: "8bc44ef" },
        { name: "staging", repo, lastCommit: "1d9ab30" },
      ];
      res.json({ branches: mockBranches });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: errorMessage });
    }
  }

  return {
    listCommits,
    getRepositories,
    getBranches,
  };
}

module.exports = {
  createCommitsController,
};
