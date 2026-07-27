import { randomBytes } from "node:crypto";

/**
 * Build a deterministic multipart/form-data payload for OpenAI Realtime.
 * We intentionally construct the bytes ourselves instead of relying on the
 * runtime's FormData implementation, because different serverless runtimes
 * have historically serialized Blob/File parts differently.
 */
export function buildRealtimeMultipart(sdp, session) {
  if (typeof sdp !== "string" || !sdp.trim()) {
    throw new TypeError("SDP must be a non-empty string");
  }

  const boundary = `----xiaoyu-realtime-${randomBytes(12).toString("hex")}`;
  const sessionJson = JSON.stringify(session);
  const crlf = "\r\n";

  const parts = [
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="sdp"; filename="offer.sdp"${crlf}`,
    `Content-Type: application/sdp${crlf}${crlf}`,
    sdp,
    crlf,
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="session"${crlf}`,
    `Content-Type: application/json${crlf}${crlf}`,
    sessionJson,
    crlf,
    `--${boundary}--${crlf}`
  ];

  const body = Buffer.from(parts.join(""), "utf8");
  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
    contentLength: String(body.byteLength),
    boundary
  };
}

export function parseOpenAIError(raw, fallback = "建立語音連線失敗") {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.error?.message || fallback;
  } catch {
    return raw?.trim()?.slice(0, 500) || fallback;
  }
}
