import { baseInstructions, readBody, sanitizeKnowledge } from "../lib/shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: "尚未設定 OPENAI_API_KEY，語音模式目前不可用。" });

  const body = readBody(req);
  if (!body.sdp || typeof body.sdp !== "string") return res.status(400).json({ error: "缺少 WebRTC SDP" });

  const session = {
    type: "realtime",
    model: process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini",
    output_modalities: ["audio"],
    max_output_tokens: 420,
    instructions: `${baseInstructions(sanitizeKnowledge(body.knowledge))}\n\n【語音表現】使用自然的台灣國語口音，聲音溫和、有精神，語速略快但清楚。先直接回答，再問一個必要的問題。`,
    audio: {
      input: {
        noise_reduction: { type: "near_field" },
        transcription: {
          model: "gpt-4o-mini-transcribe",
          language: "zh",
          prompt: "台灣繁體中文電商客服對話，可能包含產品名稱、成分、價格與物流。"
        },
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 250,
          silence_duration_ms: 420,
          create_response: true,
          interrupt_response: true
        }
      },
      output: {
        voice: process.env.OPENAI_REALTIME_VOICE || "marin",
        speed: 1.05
      }
    }
  };

  try {
    const form = new FormData();
    form.append("sdp", new Blob([body.sdp], { type: "application/sdp" }), "offer.sdp");
    form.append("session", new Blob([JSON.stringify(session)], { type: "application/json" }), "session.json");

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form
    });

    const answerSdp = await response.text();
    if (!response.ok) {
      console.error("Realtime error", answerSdp);
      let message = "建立語音連線失敗";
      try { message = JSON.parse(answerSdp)?.error?.message || message; } catch {}
      return res.status(response.status).json({ error: message });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ answerSdp, callId: response.headers.get("location") || null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "建立語音連線失敗，請稍後再試。" });
  }
}
