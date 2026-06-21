function createAiController({ groq }) {
  async function summarizeIncident(req, res) {
    if (!groq) {
      return res.status(503).json({ error: "Groq API key is not configured." });
    }

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
  }

  async function queryAssistant(req, res) {
    if (!groq) {
      return res.status(503).json({ error: "Groq API key is not configured." });
    }

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "llama3-70b-8192",
      messages: [
        {
          role: "system",
          content: "Answer as a concise SRE assistant using the supplied logs and incidents.",
        },
        {
          role: "user",
          content: req.body.question || "",
        },
      ],
      temperature: 0.1,
    });

    res.json({ answer: completion.choices[0]?.message?.content || "" });
  }

  return {
    summarizeIncident,
    queryAssistant,
  };
}

module.exports = {
  createAiController,
};
