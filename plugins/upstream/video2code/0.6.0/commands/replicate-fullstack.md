---
description: 全栈复刻一段操作录屏 — 观察(含后端行为)→切片→计划(含 Backend design)→构建(前端 web-replicate 脚手架 + Express/sqlite 后端)→录像+curl 双叉验证, 产出 out/plan.md、out/verify.jsonl、out/report.md 三件套
argument-hint: "<视频路径（mp4/webm 等）或网站 URL> [素材清单 catalog.json 路径]"
skills: video2fullstack, web-replicate, url2video
---

按 `video2fullstack` skill 的完整流程,把这段**操作录屏**复刻成一个**可运行的前后端完整项目**(不是纯前端)。

- 源视频: `$1` — 若这是一个 http(s) URL 而非本地视频, 先按 `url2video` skill
  把该网站动效录成 `recordings/<name>.webm` 再用 ffmpeg 转成 `recordings/<name>.mp4`
  (survey→写剧本→录制→转码→审片), 再以该 MP4 为源视频走下述流程 (审片那次 ingest 的
  contact sheet 可用时直接复用, 不重复摄入)。
- 素材清单 (可选): `$2` — 若提供, 把它拷/链接为项目目录下的
  `assets_catalog.json`, 之后 `get_asset(ref)` 才可用; 未提供则按无清单方案自主取材。

关键要求(与纯前端 `/replicate` 的区别):
- **前端**用 `web-replicate` 的 `init-webapp.sh` 搭脚手架(React+Vite+Tailwind+shadcn),
  还原布局/样式/文案/交互;
- **后端**在 `app/server/` 自建 Express + better-sqlite3 单进程服务, 实现视频中演示到的
  **所有服务端行为**(购物车/下单/点赞/评论/状态机等), 前端数据一律来自 `/api/*` 而非硬编码;
- 严格四阶段: 观察(含**行为观察**: 实体/操作/状态迁移+时间戳)→ `clip_video` 切片消歧 →
  写 `out/plan.md`(含 **Backend design** 节: 表/API/种子, 以及 [S#]/[D#]/[B#] 逐条带实测)
  → 构建 + `npm run build && npm run seed && npm start`(后台起 `:3000`) + 逐条验证
  (**[B] 双叉**: `curl` 直接打 API + ZCode `control-browser` IAB 重演操作并跨整页刷新断言)
  → `out/report.md` 收尾。
- 浏览、截图、录像一律走 ZCode 内置 Browser Use (IAB), 不装 Playwright/外部浏览器;
  **useState/localStorage/打包进前端的数据永远不能通过 [B] 验证** —— 后端行为必须由
  真实 HTTP API + 持久化提供。
