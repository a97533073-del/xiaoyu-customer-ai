import {
  baseInstructions,
  readBody,
  sanitizeKnowledge
} from "../lib/shared.js";

function createMultipart(sdp, session) {
  const boundary =
    `----xiaoyu-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

  const crlf = "\r\n";

  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="sdp"; filename="offer.sdp"${crlf}` +
      `Content-Type: application/sdp${crlf}${crlf}`
    ),

    Buffer.from(sdp, "utf8"),

    Buffer.from(
      `${crlf}--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="session"${crlf}` +
      `Content-Type: application/json${crlf}${crlf}`
    ),

    Buffer.from(JSON.stringify(session), "utf8"),

    Buffer.from(`${crlf}--${boundary}--${crlf}`)
  ]);

  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: "尚未設定 OPENAI_API_KEY"
    });
  }

  const requestBody = readBody(req);

  if (
    typeof requestBody.sdp !== "string" ||
    !requestBody.sdp.trim()
  ) {
    return res.status(400).json({
      error: "缺少 WebRTC SDP"
    });
  }

  const model =
    process.env.OPENAI_REALTIME_MODEL ||
    "gpt-realtime-mini";

  const session = {
    type: "realtime",
    model,
    output_modalities: ["audio"],
    max_output_tokens: 420,

    instructions:
      `${baseInstructions(
        sanitizeKnowledge(requestBody.knowledge)
      )}\n\n` +
      "使用自然、親切的台灣國語口吻回答。" +
      "聲音溫和、清楚，先回答問題，不要過度推銷。",

    audio: {
      input: {
        noise_reduction: {
          type: "near_field"
        },

        transcription: {
          model: "gpt-4o-mini-transcribe",
          language: "zh",
          prompt:
            "台灣繁體中文電商客服對話，" +
            "可能包含產品、成分、價格與物流。"
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
        voice:
          process.env.OPENAI_REALTIME_VOICE ||
          "marin",
        speed: 1.05
      }
    }
  };

  try {
    const multipart = createMultipart(
      requestBody.sdp,
      session
    );

    const response = await fetch(
      "https://api.openai.com/v1/realtime/calls",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${process.env.OPENAI_API_KEY}`,

          Accept: "application/sdp",

          "Content-Type":
            multipart.contentType,

          "Content-Length":
            String(multipart.body.length)
        },

        body: multipart.body
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "REALTIME_FIXED_ERROR",
        response.status,
        responseText
      );

      let message = "建立語音連線失敗";

      try {
        message =
          JSON.parse(responseText)?.error?.message ||
          message;
      } catch {}

      return res.status(response.status).json({
        error: message
      });
    }

    if (!responseText.startsWith("v=")) {
      return res.status(502).json({
        error: "OpenAI 沒有回傳有效 SDP"
      });
    }

    res.setHeader("Cache-Control", "no-store");

    return res.status(200).json({
      answerSdp: responseText,
      model
    });
  } catch (error) {
    console.error(
      "REALTIME_FIXED_EXCEPTION",
      error
    );

    return res.status(500).json({
      error: "建立語音連線失敗，請稍後再試"
    });
  }
}
