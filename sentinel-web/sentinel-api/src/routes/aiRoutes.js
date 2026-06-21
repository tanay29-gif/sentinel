const express = require("express");
const { createAiController } = require("../controllers/aiController");

function createAiRoutes(dependencies) {
  const router = express.Router();
  const aiController = createAiController(dependencies);

  router.post("/summarize-incident", aiController.summarizeIncident);
  router.post("/query", aiController.queryAssistant);

  return router;
}

module.exports = {
  createAiRoutes,
};
