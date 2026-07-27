const DEFAULT_KNOWLEDGE = {
  "brand_name": "島嶼生活館",
  "service_name": "小嶼客服",
  "language": "繁體中文",
  "service_style": "使用自然、親切、簡潔的台灣客服說法，不裝熟、不過度推銷。",
  "products": [
    {
      "id": "pumpkin-lycopene-demo",
      "name": "南瓜籽茄紅素膠囊",
      "category": "日常營養補充",
      "status": "示範資料，正式上線前請替換",
      "summary": "以南瓜籽油、茄紅素等成分為主的日常營養補充產品。不得宣稱治療、改善疾病或保證效果。",
      "ingredients": [
        "南瓜籽油 250mg",
        "茄紅素 2000μg",
        "石榴籽萃取物 250mg",
        "葉黃素 200μg",
        "亞麻籽萃取物 50mg",
        "Omega-3 脂肪酸 70mg",
        "共軛亞油酸 100mg"
      ],
      "price": "待設定",
      "usage": "請依產品外盒或標示方式使用；資料不足時轉人工確認。",
      "audience": "希望補充日常營養的成年消費者。",
      "cautions": [
        "孕婦、哺乳期、慢性病患者或正在服藥者，使用前先詢問醫師或藥師。",
        "本產品不是藥品，不能替代正規醫療或藥物。",
        "不得對個別症狀做診斷。"
      ],
      "shipping": "台灣地區配送時效與運費待設定。"
    }
  ],
  "policies": {
    "medical": "不可聲稱治療、治癒、降低疾病風險或保證效果；遇到症狀、用藥、孕哺或慢性病問題，建議詢問醫師或藥師。",
    "pricing": "價格、優惠、庫存未在知識庫明確記載時，不可自行猜測。",
    "refund": "退換貨與退款爭議轉人工客服處理。",
    "privacy": "不要主動索取身分證、完整信用卡號、網銀密碼等敏感資料。"
  },
  "handoff": {
    "trigger": [
      "退款或客訴",
      "症狀嚴重或緊急狀況",
      "要求醫療診斷",
      "價格與庫存資料不足",
      "客戶明確要求真人"
    ],
    "message": "這個部分我幫您轉由真人客服確認會比較準確喔。"
  }
};

const els = {
  messages: document.querySelector("#messages"),
  input: document.querySelector("#messageInput"),
  send: document.querySelector("#sendButton"),
  voice: document.querySelector("#voiceButton"),
  status: document.querySelector("#connectionStatus"),
  latency: document.querySelector("#latencyValue"),
  voiceHint: document.querySelector("#voiceHint"),
  productList: document.querySelector("#productList"),
  productCount: document.querySelector("#productCount"),
  dialog: document.querySelector("#adminDialog"),
  editor: document.querySelector("#knowledgeEditor"),
  productDescription: document.querySelector("#productDescription"),
  addProduct: document.querySelector("#addProductButton"),
  saveKnowledge: document.querySelector("#saveKnowledge"),
  resetKnowledge: document.querySelector("#resetKnowledge"),
  toast: document.querySelector("#adminToast"),
  remoteAudio: document.querySelector("#remoteAudio"),
  apiStatus: document.querySelector("#apiStatus")
};

const state = {
  messages: [],
  knowledge: null,
  defaultKnowledge: null,
  voice: { active: false, pc: null, dc: null, stream: null, assistantRow: null, assistantText: "" }
};

async function init() {
  state.defaultKnowledge = DEFAULT_KNOWLEDGE;
  if (!isLocalPreview()) {
    try {
      const statusResponse = await fetch("./api/status", { cache: "no-store" });
      const apiStatus = await statusResponse.json();
      if (els.apiStatus) {
        els.apiStatus.textContent = apiStatus.openai_configured ? "GPT 已連線" : "展示模式";
        els.apiStatus.closest(".secure-pill")?.classList.toggle("is-offline", !apiStatus.openai_configured);
      }
    } catch {
      if (els.apiStatus) els.apiStatus.textContent = "狀態未知";
    }
  } else if (els.apiStatus) {
    els.apiStatus.textContent = "本機展示";
  }
  if (location.protocol !== "file:") {
    try {
      const response = await fetch("./data/knowledge.json");
      if (response.ok) state.defaultKnowledge = await response.json();
    } catch {
      // 使用內建示範資料，確保本機預覽也能正常開啟。
    }
  }
  try {
    state.knowledge = JSON.parse(localStorage.getItem("taiwan-service-knowledge")) || state.defaultKnowledge;
  } catch {
    state.knowledge = state.defaultKnowledge;
  }
  renderKnowledge();
  const localNote = location.protocol === "file:" ? "（目前是本機展示模式）" : "";
  addMessage("assistant", `您好～我是${state.knowledge.service_name || "小嶼客服"}${localNote}。您可以直接打字詢問產品、價格、用法或物流喔。`);
}

function isLocalPreview() {
  return location.protocol === "file:";
}

function demoReply(text) {
  const q = text.toLowerCase();
  const products = state.knowledge?.products || [];
  const product = products[0];
  const handoff = state.knowledge?.handoff?.message || "這個部分我幫您轉由真人客服確認會比較準確喔。";

  if (/退款|退貨|客訴|投訴|真人/.test(text)) return handoff;
  if (/價格|多少錢|優惠|庫存/.test(text)) {
    return product?.price && product.price !== "待設定"
      ? `目前${product.name}的價格是${product.price}喔。`
      : `目前${product?.name || "這款產品"}的價格還沒有設定完成，${handoff}`;
  }
  if (/成分|配方|裡面有什麼/.test(text)) {
    const items = product?.ingredients || [];
    return items.length
      ? `${product.name}目前知識庫中的主要成分有：${items.join("、")}。實際仍請以產品外盒標示為準喔。`
      : `目前成分資料還不完整，${handoff}`;
  }
  if (/怎麼吃|用法|一天|幾顆|使用/.test(text)) {
    return product?.usage || `目前使用方式還沒有設定完整，${handoff}`;
  }
  if (/多久|送到|物流|出貨|配送/.test(text)) {
    return product?.shipping || `目前物流資料還沒有設定完整，${handoff}`;
  }
  if (/功效|效果|治療|改善|血糖|血壓|疾病/.test(text)) {
    return `這款屬於日常營養補充，不能代替藥物或醫療診斷喔。若您正在服藥、有慢性病，或想確認是否適合自己，建議先詢問醫師或藥師會比較安心。`;
  }
  return `有的～目前我可以協助您查詢產品成分、價格、使用方式與物流。您也可以直接問：「這款怎麼吃？」或「主要成分有哪些？」`;
}

function speakText(text) {
  if (!isLocalPreview() || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-TW";
  utterance.rate = 1.02;
  window.speechSynthesis.speak(utterance);
}

function addMessage(role, text, meta = "", record = true) {
  const row = document.createElement("div");
  row.className = `message-row ${role}`;
  const wrap = document.createElement("div");
  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = text;
  wrap.appendChild(bubble);
  if (meta) {
    const metaEl = document.createElement("div");
    metaEl.className = "message-meta";
    metaEl.textContent = meta;
    wrap.appendChild(metaEl);
  }
  row.appendChild(wrap);
  els.messages.appendChild(row);
  els.messages.scrollTop = els.messages.scrollHeight;
  if (record && (role === "user" || role === "assistant")) state.messages.push({ role, content: text });
  return { row, bubble };
}

function addTyping() {
  const row = document.createElement("div");
  row.className = "message-row assistant";
  row.innerHTML = '<div class="message-bubble"><div class="typing"><span></span><span></span><span></span></div></div>';
  els.messages.appendChild(row);
  els.messages.scrollTop = els.messages.scrollHeight;
  return row;
}

async function sendMessage(text = els.input.value.trim()) {
  if (!text) return;
  els.input.value = "";
  autoResize();
  addMessage("user", text);
  const typing = addTyping();
  els.send.disabled = true;
  const started = performance.now();

  try {
    if (isLocalPreview()) {
      await new Promise((resolve) => setTimeout(resolve, 420));
      typing.remove();
      const reply = demoReply(text);
      els.latency.textContent = "0.4 秒";
      addMessage("assistant", reply, "本機展示模式");
      speakText(reply);
    } else {
      const response = await fetch("./api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: state.messages, knowledge: state.knowledge })
      });
      const data = await response.json();
      typing.remove();
      if (!response.ok) throw new Error(data.error || "客服暫時無法回覆");
      const latency = data.latency_ms || Math.round(performance.now() - started);
      els.latency.textContent = `${Math.max(0.1, latency / 1000).toFixed(1)} 秒`;
      addMessage("assistant", data.text, data.mode === "demo" ? "展示模式・設定 API Key 後啟用 GPT" : `模型回覆 ${latency}ms`);
    }
  } catch (error) {
    typing.remove();
    const reply = demoReply(text);
    addMessage("assistant", reply, "連線失敗，已切換展示模式");
    speakText(reply);
  } finally {
    els.send.disabled = false;
    els.input.focus();
  }
}

function autoResize() {
  els.input.style.height = "auto";
  els.input.style.height = `${Math.min(130, els.input.scrollHeight)}px`;
}

function renderKnowledge() {
  const products = state.knowledge?.products || [];
  els.productCount.textContent = `${products.length} 個產品`;
  els.productList.innerHTML = products.length ? products.map((p) => `
    <article class="product-item">
      <div class="product-item-top">
        <span class="product-icon">◈</span>
        <div><strong>${escapeHtml(p.name || "未命名產品")}</strong><small>${escapeHtml(p.category || "待分類")}</small></div>
      </div>
      <div class="product-tags">
        <span>${escapeHtml(p.price || "價格待設定")}</span>
        <span>${(p.ingredients || []).length} 項成分</span>
        <span>${escapeHtml(p.status || "已啟用")}</span>
      </div>
    </article>`).join("") : '<div class="product-item">目前沒有產品資料</div>';
  els.editor.value = JSON.stringify(state.knowledge, null, 2);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
}

function openAdmin() {
  els.editor.value = JSON.stringify(state.knowledge, null, 2);
  els.toast.textContent = "";
  els.dialog.showModal();
}

function saveKnowledge() {
  try {
    const parsed = JSON.parse(els.editor.value);
    if (!Array.isArray(parsed.products)) throw new Error("products 必須是陣列");
    state.knowledge = parsed;
    localStorage.setItem("taiwan-service-knowledge", JSON.stringify(parsed));
    renderKnowledge();
    els.toast.textContent = "已儲存。新的對話與語音連線會立即使用這份資料。";
  } catch (error) {
    els.toast.textContent = `格式錯誤：${error.message}`;
  }
}

async function addProductFromText() {
  const description = els.productDescription.value.trim();
  if (!description) {
    els.toast.textContent = "請先輸入產品資料。";
    return;
  }
  els.addProduct.disabled = true;
  els.addProduct.textContent = "正在整理…";
  els.toast.textContent = "";
  try {
    let product;
    let mode = "api";
    if (isLocalPreview()) {
      mode = "local";
      const nameMatch = description.match(/(?:產品叫做|產品名稱是|名稱是|叫做|叫)([^，,。\n]+)/);
      const priceMatch = description.match(/(?:價格|售價)(?:是|為|:|：)?\s*([^，,。\n]+)/);
      product = {
        id: `local-${Date.now()}`,
        name: nameMatch?.[1]?.trim() || description.slice(0, 18) || "新產品",
        category: "待分類",
        status: "本機新增",
        summary: description,
        ingredients: [],
        price: priceMatch?.[1]?.trim() || "待設定",
        usage: "待設定",
        audience: "待設定",
        cautions: ["請依實際產品標示與法規補充完整資料。"],
        shipping: "待設定"
      };
    } else {
      const response = await fetch("./api/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "整理失敗");
      product = data.product;
      mode = data.mode;
    }
    const current = JSON.parse(els.editor.value);
    current.products = Array.isArray(current.products) ? current.products : [];
    current.products.push(product);
    els.editor.value = JSON.stringify(current, null, 2);
    els.productDescription.value = "";
    els.toast.textContent = mode === "local"
      ? "已加入本機展示資料，請檢查後按「儲存知識庫」。"
      : mode === "demo"
        ? "已加入展示資料；設定 API Key 後會由 GPT 精準整理。"
        : "AI 已整理並加入，請檢查後按「儲存知識庫」。";
  } catch (error) {
    els.toast.textContent = error.message;
  } finally {
    els.addProduct.disabled = false;
    els.addProduct.textContent = "AI 整理並加入";
  }
}

async function toggleVoice() {
  if (state.voice.active) return stopVoice();
  await startVoice();
}

async function startVoice() {
  if (isLocalPreview()) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      els.voiceHint.textContent = "目前瀏覽器不支援本機語音辨識；部署到 HTTPS 後可啟用 GPT 即時語音。";
      addMessage("assistant", "目前這個本機檔案可以測試文字與管理功能；真正的 GPT 即時語音需要部署到 HTTPS 網址後啟用喔。", "本機展示模式");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    els.voice.classList.add("active");
    els.status.textContent = "正在聽您說話…";
    els.voiceHint.textContent = "請直接說一句話，說完後會自動送出。";
    recognition.onresult = (event) => {
      const text = event.results?.[0]?.[0]?.transcript?.trim();
      if (text) sendMessage(text);
    };
    recognition.onerror = () => {
      els.voiceHint.textContent = "沒有收到語音，請再試一次，或直接打字。";
    };
    recognition.onend = () => {
      els.voice.classList.remove("active");
      els.status.textContent = "文字客服已就緒";
      els.voiceHint.textContent = "按一下麥克風可使用瀏覽器語音輸入；正式 GPT Live 需部署到 HTTPS。";
    };
    recognition.start();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    addMessage("assistant", "目前瀏覽器不支援即時語音，請改用最新版 Chrome、Edge 或 Safari。", "瀏覽器不支援");
    return;
  }

  els.voice.disabled = true;
  els.status.textContent = "正在連線即時語音…";
  els.voiceHint.textContent = "正在取得麥克風權限並建立 WebRTC 連線…";

  let pc = null;
  let dc = null;
  let stream = null;

  try {
    pc = new RTCPeerConnection();
    dc = pc.createDataChannel("oai-events");
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });

    state.voice.pc = pc;
    state.voice.dc = dc;
    state.voice.stream = stream;

    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      els.remoteAudio.srcObject = event.streams[0];
      els.remoteAudio.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      const connectionState = pc.connectionState;
      if (connectionState === "connected") {
        els.status.textContent = "即時語音已連線";
      }
      if (["failed", "closed"].includes(connectionState) && state.voice.active) {
        addMessage("assistant", "語音連線已中斷，您可以再按一次麥克風重新連線喔。", "即時語音");
        stopVoice();
      }
    };

    dc.onopen = () => {
      state.voice.active = true;
      els.voice.classList.add("active");
      els.status.textContent = "即時語音已連線";
      els.voiceHint.textContent = "正在聆聽。您可以直接說話，也可以在客服說話時插話。";
      els.voice.disabled = false;
    };
    dc.onmessage = handleRealtimeEvent;
    dc.onerror = () => {
      els.voiceHint.textContent = "語音資料通道發生錯誤，請重新連線。";
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const sdp = pc.localDescription?.sdp;
    if (!sdp) throw new Error("瀏覽器沒有產生 WebRTC SDP");

    const response = await fetch("./api/realtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sdp, knowledge: state.knowledge })
    });

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : { error: await response.text() };

    if (!response.ok) {
      throw new Error(data.error || `建立語音連線失敗（${response.status}）`);
    }
    if (!data.answerSdp) throw new Error("伺服器沒有回傳 SDP answer");

    await pc.setRemoteDescription({ type: "answer", sdp: data.answerSdp });
  } catch (error) {
    stream?.getTracks().forEach((track) => track.stop());
    dc?.close();
    pc?.close();
    state.voice = { active: false, pc: null, dc: null, stream: null, assistantRow: null, assistantText: "" };
    els.voice.classList.remove("active");
    els.status.textContent = "文字客服已就緒";
    els.voiceHint.textContent = `語音模式無法啟用：${error.message}`;
    addMessage("assistant", `語音目前無法連線：${error.message}`, "即時語音");
  } finally {
    els.voice.disabled = false;
  }
}
function handleRealtimeEvent(event) {
  let data;
  try { data = JSON.parse(event.data); } catch { return; }

  if (data.type === "conversation.item.input_audio_transcription.completed" && data.transcript?.trim()) {
    addMessage("user", data.transcript.trim(), "語音輸入");
  }

  if (data.type === "response.output_audio_transcript.delta") {
    if (!state.voice.assistantRow) {
      const created = addMessage("assistant", "", "即時語音", false);
      state.voice.assistantRow = created;
      state.voice.assistantText = "";
    }
    state.voice.assistantText += data.delta || "";
    state.voice.assistantRow.bubble.textContent = state.voice.assistantText;
    els.messages.scrollTop = els.messages.scrollHeight;
  }

  if (data.type === "response.output_audio_transcript.done") {
    const finalText = data.transcript?.trim() || state.voice.assistantText.trim();
    if (state.voice.assistantRow && finalText) state.voice.assistantRow.bubble.textContent = finalText;
    if (finalText) state.messages.push({ role: "assistant", content: finalText });
    state.voice.assistantRow = null;
    state.voice.assistantText = "";
  }

  if (data.type === "input_audio_buffer.speech_started") {
    els.status.textContent = "正在聽您說話…";
  }
  if (data.type === "input_audio_buffer.speech_stopped") {
    els.status.textContent = "正在整理回覆…";
  }
  if (data.type === "output_audio_buffer.started") {
    els.status.textContent = "客服正在回覆";
  }
  if (data.type === "output_audio_buffer.stopped") {
    els.status.textContent = "即時語音已連線";
  }
  if (data.type === "error") {
    els.voiceHint.textContent = data.error?.message || "即時語音發生錯誤";
  }
}

function stopVoice() {
  state.voice.stream?.getTracks().forEach((track) => track.stop());
  state.voice.dc?.close();
  state.voice.pc?.close();
  if (els.remoteAudio) els.remoteAudio.srcObject = null;
  state.voice = { active: false, pc: null, dc: null, stream: null, assistantRow: null, assistantText: "" };
  els.voice.classList.remove("active");
  els.voice.disabled = false;
  els.status.textContent = "文字客服已就緒";
  els.voiceHint.textContent = isLocalPreview() ? "按一下麥克風可使用瀏覽器語音輸入；正式 GPT Live 需部署到 HTTPS。" : "按一下麥克風開始即時語音，客戶說完後就會回覆。";
}

els.send.addEventListener("click", () => sendMessage());
els.input.addEventListener("input", autoResize);
els.input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});
els.voice.addEventListener("click", toggleVoice);
document.querySelectorAll("#quickActions button").forEach((button) => button.addEventListener("click", () => sendMessage(button.textContent)));
document.querySelector("#openAdmin").addEventListener("click", openAdmin);
document.querySelector("#openAdminBottom").addEventListener("click", openAdmin);
els.saveKnowledge.addEventListener("click", saveKnowledge);
els.addProduct.addEventListener("click", addProductFromText);
els.resetKnowledge.addEventListener("click", () => {
  state.knowledge = structuredClone(state.defaultKnowledge);
  els.editor.value = JSON.stringify(state.knowledge, null, 2);
  els.toast.textContent = "已載入示範資料，按儲存後生效。";
});
window.addEventListener("beforeunload", stopVoice);

init().catch((error) => addMessage("assistant", `初始化失敗：${error.message}`));
