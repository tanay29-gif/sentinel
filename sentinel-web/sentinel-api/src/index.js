require("dotenv").config();

const cors = require("cors");
const express = require("express");
const Groq = require("groq-sdk");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const port = process.env.PORT || 4000;

const supabase =
  process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sentinel-api", ai: Boolean(groq), database: Boolean(supabase) });
});

app.get("/api/incidents", async (_req, res) => {
  if (!supabase) {
    return res.json({ incidents: [] });
  }

  const { data, error } = await supabase
    .from("incidents")
    .select("*, services(name), tasks(*)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ incidents: data });
});

app.post("/api/incidents", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase is not configured." });

  const { data, error } = await supabase
    .from("incidents")
    .insert({
      title: req.body.title,
      severity: req.body.severity || "SEV-3",
      status: "Triage",
      service_id: req.body.service_id,
      summary: req.body.summary || "",
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ incident: data });
});

app.post("/api/ai/summarize-incident", async (req, res) => {
  if (!groq) return res.status(503).json({ error: "Groq API key is not configured." });

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      {
        role: "system",
        content:
          "You are Sentinel, an expert DevOps incident copilot. Return concise summaries, suspected root cause, evidence, and next actions.",
      },
      {
        role: "user",
        content: JSON.stringify(req.body, null, 2),
      },
    ],
    temperature: 0.2,
  });

  res.json({ summary: completion.choices[0]?.message?.content || "" });
});

app.post("/api/ai/query", async (req, res) => {
  if (!groq) return res.status(503).json({ error: "Groq API key is not configured." });

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama3-70b-8192",
    messages: [
      { role: "system", content: "Answer as a concise SRE assistant using the supplied logs and incidents." },
      { role: "user", content: req.body.question || "" },
    ],
    temperature: 0.1,
  });

  res.json({ answer: completion.choices[0]?.message?.content || "" });
});

app.listen(port, () => {
  console.log(`SENTINEL API listening on http://localhost:${port}`);
});
