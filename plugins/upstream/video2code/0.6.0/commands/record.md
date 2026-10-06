---
description: 用 ZCode 内置 Browser Use WebView 把网站 URL 的动效录成 WebM 再用 ffmpeg 转 MP4 — 踩点→编排动作→录制→转码→审片
argument-hint: "<url> [输出名]"
skills: url2video
---

按 `url2video` skill 的完整流程录制：

- 目标 URL: `$1`
- 输出名: `$2`，未提供则从 URL 生成 kebab-case 名

使用 ZCode 官方 `control-browser` skill 打开和踩点页面，编排内置 recording action DSL，
通过 `tab.recording.start()` + `status(..., {outputPath})` 产出
`recordings/<name>.webm`（ZCode 只落 WebM），随后用 ffmpeg 转成 `recordings/<name>.mp4`
（H.264 / yuv420p / CFR，`-r` 与录制 fps 一致），原 webm 保留。
再用 `ingest_video` 审片转好的 MP4；不合格最多调整动作重录两次。

不得安装或启动外部 Playwright、独立 Chromium。只录视频，不做复刻。
