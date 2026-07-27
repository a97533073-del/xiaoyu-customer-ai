export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({
    openai_configured: Boolean(process.env.OPENAI_API_KEY),
    text_model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini",
    realtime_model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini",
    realtime_voice: process.env.OPENAI_REALTIME_VOICE || "marin"
  });
}
