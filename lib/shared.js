export function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return {};
}

export function sanitizeKnowledge(value) {
  if (!value) return "尚未提供產品知識。";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.slice(0, 18000);
}

export function baseInstructions(knowledge) {
  return `你是台灣電商品牌的線上客服，名稱是「小嶼客服」。\n
【語言與口吻】\n- 一律使用繁體中文與自然的台灣國語用詞。\n- 親切、直接、簡短，每次原則上 1 到 4 句。\n- 可以自然使用「您好」、「請問」、「這邊」、「喔」、「沒問題」、「我幫您確認」等說法，但不要每句都加語助詞。\n- 不要使用中國大陸客服腔，例如「亲」、「宝子」、「这边给您安排」。\n
【客服規則】\n- 只依照知識庫回答產品、價格、用法、物流與售後。\n- 資料不足就明確說需要真人確認，不可編造。\n- 不做醫療診斷，不宣稱治療、治癒、改善疾病或保證效果。\n- 遇到孕哺、慢性病、正在服藥、嚴重不適，提醒先詢問醫師或藥師。\n- 退款、重大客訴、特殊價格、資料矛盾或客戶要求真人時，轉人工。\n- 優先先回答問題，再用一句簡短問題了解需求；不要強迫推銷。\n
【產品與政策知識庫】\n${knowledge}`;
}

export function extractResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if ((content?.type === "output_text" || content?.type === "text") && content?.text) chunks.push(content.text);
    }
  }
  return chunks.join("").trim();
}

export function demoReply(question, knowledgeObject) {
  const q = String(question || "").toLowerCase();
  const products = knowledgeObject?.products || [];
  const product = products.find((p) => q.includes(String(p.name || "").toLowerCase())) || products[0];

  if (/真人|人工|客服/.test(q)) return "沒問題，我幫您轉由真人客服確認喔。";
  if (/退款|退貨|客訴|投诉/.test(q)) return "退款或客訴需要由真人核對訂單資料，我先幫您轉人工客服處理喔。";
  if (/懷孕|怀孕|哺乳|吃藥|吃药|慢性病|不舒服|疼|痛/.test(q)) return "這類情況會牽涉個人健康與用藥，建議先詢問醫師或藥師；我們的產品不能替代醫療喔。";
  if (/價格|价钱|多少錢|多少钱|優惠|优惠/.test(q)) return product?.price && product.price !== "待設定" ? `${product.name}目前標示價格是 ${product.price}。` : "目前知識庫還沒有設定正式價格，我幫您轉真人客服確認會比較準確喔。";
  if (/成分|配方/.test(q) && product) return `${product.name}目前登記的主要成分有：${(product.ingredients || []).slice(0, 5).join("、")}。完整標示仍以產品包裝為準喔。`;
  if (/怎麼吃|怎么吃|用法|一天/.test(q) && product) return product.usage || "使用方式目前沒有完整資料，我幫您轉真人客服確認喔。";
  if (/功效|有效|治療|治疗|改善/.test(q) && product) return `${product.name}是日常營養補充品，不能當作藥品，也不能保證治療或改善疾病。您比較想了解成分、吃法，還是適用注意事項呢？`;
  if (product) return `您好～${product.name}主要是${product.summary} 您想先了解成分、使用方式，還是價格與配送呢？`;
  return "您好～目前還沒有匯入完整產品資料。您可以先告訴我產品名稱與想了解的問題，我會依現有資料回答；不確定的部分會轉人工確認喔。";
}
