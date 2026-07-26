import { baseInstructions, demoReply, extractResponseText, readBody, sanitizeKnowledge } from "../lib/shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const started = Date.now();
  const body = readBody(req);
  const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const knowledgeObject = body.knowledge && typeof body.knowledge === "object" ? body.knowledge : {};
  const knowledge = sanitizeKnowledge(body.knowledge);
  const latestQuestion = [...messages].reverse().find((m) => m?.role === "user")?.content || "";

  if (!process.env.OPENAI_API_KEY) {
    return res.status(200).json({
      text: demoReply(latestQuestion, knowledgeObject),
      mode: "demo",
      latency_ms: Date.now() - started
    });
  }

  const input = messages
    .filter((m) => ["user", "assistant"].includes(m?.role) && typeof m?.content === "string")
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini",
        instructions: baseInstructions(knowledge),
        input,
        max_output_tokens: 320,
        store: false
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI response error", data);
      return res.status(response.status).json({ error: data?.error?.message || "模型暫時無法回覆" });
    }

    const text = extractResponseText(data);
    return res.status(200).json({
      text: text || "不好意思，我目前沒有取得完整回覆，請再說一次喔。",
      mode: "openai",
      latency_ms: Date.now() - started
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "連線模型失敗，請稍後再試。" });
  }
}
