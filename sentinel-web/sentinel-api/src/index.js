require("dotenv").config();

const cors = require("cors");
const express = require("express");
const Groq = require("groq-sdk");
const { createClient } = require("@supabase/supabase-js");
const { createAiRoutes } = require("./routes/aiRoutes");
const { createHealthRoutes } = require("./routes/healthRoutes");
const { createIncidentsRoutes } = require("./routes/incidentsRoutes");

const app = express();
const port = process.env.PORT || 4000;

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

app.use(cors());
app.use(express.json());

const dependencies = { groq, supabase };

app.use(createHealthRoutes(dependencies));
app.use("/api/incidents", createIncidentsRoutes(dependencies));
app.use("/api/ai", createAiRoutes(dependencies));

app.listen(port, () => {
  console.log(`SENTINEL API listening on http://localhost:${port}`);
});
