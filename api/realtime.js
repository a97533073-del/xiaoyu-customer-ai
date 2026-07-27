import { baseInstructions, readBody, sanitizeKnowledge } from "../lib/shared.js";

function buildMultipartBody(sdp, session) {
  const boundary = `----xiaoyu-realtime-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const crlf = "\r\n";

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="sdp"; filename="offer.sdp"${crlf}` +
      `Content-Type: application/sdp${crlf}${crlf}`,
      "utf8"
    ),
    Buffer.from(sdp, "utf8"),
    Buffer.from(
      `${crlf}--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="session"${crlf}` +
      `Content-Type: application/json${crlf}${crlf}`,
      "utf8"
    ),
    Buffer.from(JSON.stringify(session), "utf8"),
    Buffer.from(`${crlf}--${boundary}--${crlf}`, "utf8")
  ]);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

function readOpenAIError(raw, fallback = "建立語音連線失敗") {
  try {
    return JSON.parse(raw)?.error?.message || fallback;
  } catch {
    return raw?.trim()?.slice(0, 500) || fallback;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ error: "尚未設定 OPENAI_API_KEY，語音模式目前不可用。" });
  }

  const body = readBody(req);
  if (typeof body.sdp !== "string" || !body.sdp.trim()) {
    return res.status(400).json({ error: "缺少 WebRTC SDP" });
  }

  const model = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime-mini";
  const session = {
    type: "realtime",
    model,
    output_modalities: ["audio"],
    max_output_tokens: 420,
    instructions: `${baseInstructions(sanitizeKnowledge(body.knowledge))}\n\n【語音表現】使用自然的台灣國語口吻，聲音溫和、有精神，語速略快但清楚。先直接回答，再問一個必要的問題。`,
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
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
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
    const multipart = buildMultipartBody(body.sdp, session);

    const response = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        Accept: "application/sdp",
        "Content-Type": multipart.contentType
      },
      body: multipart.body
    });

    const answerSdp = await response.text();

    if (!response.ok) {
      console.error("OpenAI Realtime create-call error", {
        status: response.status,
        model,
        body: answerSdp.slice(0, 1000)
      });
      return res.status(response.status).json({
        error: readOpenAIError(answerSdp),
        code: "OPENAI_REALTIME_CREATE_CALL_FAILED"
      });
    }

    if (!answerSdp.trim().startsWith("v=")) {
      return res.status(502).json({ error: "OpenAI 沒有回傳有效的語音連線資料，請稍後再試。" });
    }

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      answerSdp,
      callId: response.headers.get("location") || null,
      model
    });
  } catch (error) {
    console.error("Realtime proxy error", error);
    return res.status(500).json({ error: "建立語音連線失敗，請稍後再試。" });
  }
}
