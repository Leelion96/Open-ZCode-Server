---
description: 复刻一段网页录屏 — 观察→切片→计划→构建→录像对照验证, 产出 out/plan.md、out/verify.jsonl、out/report.md 三件套
argument-hint: "<视频路径（mp4/webm 等）或网站 URL> [素材清单 catalog.json 路径]"
skills: video2code, web-replicate, url2video
---

按 `video2code` skill 的完整流程复刻这段录屏对应的网页。

- 源视频: `$1` — 若这是一个 http(s) URL 而非本地视频, 先按 `url2video` skill
  把该网站动效录成 `recordings/<name>.webm` 再用 ffmpeg 转成 `recordings/<name>.mp4`
  (survey→写剧本→录制→转码→审片), 再以该 MP4 为源视频走下述流程 (审片那次 ingest 的
  contact sheet 可用时直接复用, 不重复摄入)。
- 素材清单 (可选, 形态 B): `$2` — 若提供, 把它拷/链接为项目目录下的
  `assets_catalog.json`, 之后 `get_asset(ref)` 才可用; 未提供则按无清单方案自主取材。

严格走四阶段: 观察 (含逐节布局静帧测量) → clip_video 切片消歧 → 写 `out/plan.md`
([S#]/[D#] 逐条带实测数字) → 构建 + deploy + 逐条验证 (追加 `out/verify.jsonl`) →
`out/report.md` 收尾。
