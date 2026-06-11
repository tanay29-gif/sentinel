const express = require("express");
const { createLogsController } = require("../controllers/logsController");

function createLogsRoutes(dependencies) {
  const router = express.Router();
  const logsController = createLogsController(dependencies);

  router.post("/", logsController.ingestLogLine);

  return router;
}

module.exports = {
  createLogsRoutes,
};
