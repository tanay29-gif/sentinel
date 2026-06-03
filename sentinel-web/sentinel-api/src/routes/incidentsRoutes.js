const express = require("express");
const { createIncidentsController } = require("../controllers/incidentsController");

function createIncidentsRoutes(dependencies) {
  const router = express.Router();
  const incidentsController = createIncidentsController(dependencies);

  router.get("/", incidentsController.listIncidents);
  router.post("/", incidentsController.createIncident);

  return router;
}

module.exports = {
  createIncidentsRoutes,
};
