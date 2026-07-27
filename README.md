# 小嶼客服 AI（語音修正版）

可部署到 Vercel 的繁體中文／台灣口吻 AI 客服，包含：

- GPT 文字客服
- OpenAI Realtime WebRTC 即時語音
- 台灣客服語氣與安全規則
- 瀏覽器產品知識庫管理
- 用自然語言新增產品
- 本機展示模式

## 这次修复了什么

旧版在 Vercel 的 Node 运行时里使用原生 `FormData + Blob` 转发 SDP，部分运行时会把 multipart 字段序列化异常，OpenAI 因而返回：

`Invalid multipart form, field "sdp" is required but not found`

修正版改为在服务器端手动构造标准 multipart 字节，确保 OpenAI 能稳定收到：

- `sdp`：`application/sdp`
- `session`：`application/json`

同时新增了：

- `/api/status`：只返回是否已配置 Key，不会暴露密钥
- 更完整的 WebRTC 断线与错误处理
- 连接失败时自动清理麦克风和 PeerConnection

## Vercel 环境变量

必填：

- `OPENAI_API_KEY`

选填：

- `OPENAI_TEXT_MODEL`，默认 `gpt-5-mini`
- `OPENAI_REALTIME_MODEL`，默认 `gpt-realtime-mini`
- `OPENAI_REALTIME_VOICE`，默认 `marin`
- `OPENAI_REALTIME_NOISE_REDUCTION`，默认 `far_field`
- `OPENAI_TRANSCRIBE_MODEL`，默认 `gpt-4o-mini-transcribe`

修改环境变量后必须重新部署，旧部署不会自动获得新变量。

## 更新现有 GitHub 仓库

将本压缩包解压后，把里面的文件上传到你仓库当前的 Root Directory：

`taiwan-customer-ai-local-fixed`

GitHub 遇到同名文件时选择覆盖／替换，提交后 Vercel 会自动部署。

## 安全

- API Key 只存在 Vercel 服务端环境变量。
- 浏览器无法读取完整 Key。
- 不要把 `.env`、Key、截图或密钥文本上传到 GitHub。
