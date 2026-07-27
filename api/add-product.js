import { extractResponseText, readBody } from "../lib/shared.js";

function fallbackProduct(description) {
  const cleaned = String(description || "").trim();
  const firstLine = cleaned.split(/[\n，。]/)[0].slice(0, 30) || "新產品";
  return {
    id: `product-${Date.now()}`,
    name: firstLine,
    category: "待分類",
    status: "由自然語言新增，請人工檢查",
    summary: cleaned.slice(0, 300),
    ingredients: [],
    price: "待設定",
    usage: "待設定",
    audience: "待設定",
    cautions: ["正式上線前請人工檢查產品資料與法規表述。"],
    shipping: "待設定"
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = readBody(req);
  const description = String(body.description || "").trim();
  if (!description) return res.status(400).json({ error: "請先輸入產品資料" });

  if (!process.env.OPENAI_API_KEY) return res.status(200).json({ product: fallbackProduct(description), mode: "demo" });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini",
        instructions: "把使用者提供的產品資料整理成一個 JSON 物件。只輸出合法 JSON，不要 Markdown。欄位固定為 id,name,category,status,summary,ingredients,price,usage,audience,cautions,shipping。ingredients 與 cautions 必須是字串陣列。不得新增使用者沒提供的功效、價格、用法或醫療聲明；缺少就填『待設定』。id 使用英文小寫、數字與連字號。",
        input: description.slice(0, 6000),
        max_output_tokens: 700,
        store: false
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "整理產品失敗" });
    const text = extractResponseText(data).replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
    let product;
    try { product = JSON.parse(text); } catch { product = fallbackProduct(description); }
    return res.status(200).json({ product, mode: "openai" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "整理產品失敗" });
  }
}
