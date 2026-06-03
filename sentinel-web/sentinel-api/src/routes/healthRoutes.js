const express = require("express");
const { createHealthController } = require("../controllers/healthController");

function createHealthRoutes(dependencies) {
  const router = express.Router();
  const healthController = createHealthController(dependencies);

  router.get("/health", healthController.getHealth);

  return router;
}

module.exports = {
  createHealthRoutes,
};
