const express = require("express");
const { createCommitsController } = require("../controllers/commitsController");

function createCommitsRoutes(dependencies) {
  const router = express.Router();
  const commitsController = createCommitsController(dependencies);

  router.get("/", commitsController.listCommits);
  router.get("/repos", commitsController.getRepositories);
  router.get("/repos/:repo/branches", commitsController.getBranches);

  return router;
}

module.exports = {
  createCommitsRoutes,
};
