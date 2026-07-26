# 小嶼客服 AI｜本機可預覽修正版

## 最簡單的打開方式

1. 解壓縮整個資料夾。
2. 不要只把 `index.html` 單獨拖出來，必須保留 `styles.css`、`app.js`、`data` 等檔案在同一個資料夾內。
3. 雙擊 `index.html`，或右鍵選擇 Google Chrome 開啟。

本修正版已支援直接使用 `file://` 開啟：

- 網頁樣式正常顯示
- 快捷問題與文字聊天可在本機展示模式運作
- 管理知識庫、修改 JSON、新增產品可使用
- 資料儲存在瀏覽器 localStorage
- Chrome 支援時，可使用瀏覽器語音輸入

## 正式 GPT / GPT Live

真正的 GPT 回覆與 GPT Live 即時語音必須部署到 HTTPS 網站，例如 Vercel，並設定：

- `OPENAI_API_KEY`
- `OPENAI_TEXT_MODEL`（選填）
- `OPENAI_REALTIME_MODEL`（選填）
- `OPENAI_REALTIME_VOICE`（選填）

這是因為 API 路由與即時語音需要雲端伺服器及安全連線，本機雙擊模式只用於查看介面和測試操作。
