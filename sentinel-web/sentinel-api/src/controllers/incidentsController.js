function createIncidentsController({ supabase }) {
  async function listIncidents(_req, res) {
    if (!supabase) {
      return res.json({ incidents: [] });
    }

    const { data, error } = await supabase
      .from("incidents")
      .select("*, services(name), tasks(*)")
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ incidents: data });
  }

  async function createIncident(req, res) {
    if (!supabase) {
      return res.status(503).json({ error: "Supabase is not configured." });
    }

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

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ incident: data });
  }

  return {
    listIncidents,
    createIncident,
  };
}

module.exports = {
  createIncidentsController,
};
