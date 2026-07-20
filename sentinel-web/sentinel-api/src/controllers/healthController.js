function createHealthController({ groq, supabase }) {
  function getHealth(_req, res) {
    
    res.json({
      ok: true,
      service: "sentinel-api",
      ai: Boolean(groq),
      database: Boolean(supabase),
    });
  }

  return {
    getHealth,
  };
}

module.exports = {
  createHealthController,
};
