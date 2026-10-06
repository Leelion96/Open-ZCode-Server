---
name: url2video
description: Record a live website with ZCode's built-in Browser Use WebView (native WebM), then transcode it to MP4 with ffmpeg. Use when a task starts from a URL and asks to record, capture, replicate, clone, 录制, 录屏, 复刻, 复现, or 还原 the site. Produces a recordings/name.mp4 deliverable (intermediate .webm kept) without Playwright or a separate Chromium.
---

# URL2Video（ZCode 内置浏览器录 WebM → ffmpeg 转 MP4）

把 URL 变成可交付、可继续作为 `video2code` 输入的 **MP4**。浏览、截图、交互和录像都在同一个
ZCode 内置 WebView 中完成；不要安装/启动 Playwright、Chrome 或其它外部浏览器。

录制环节只能产出 WebM（ZCode 录制链路的原生格式），所以本 skill 分两段：
**内置浏览器录 `.webm` → ffmpeg 转 `.mp4`**。最终交付物和下游 `video2code` 流程都走 MP4。

## 前提与边界

- 必须同时使用 ZCode 官方 `control-browser` skill，并完整遵守其 bootstrap、backend 选择、
  tab 恢复和页面安全规则。若 `iab` descriptor 或 `BrowserRecordingAPI` 不可用，明确报告版本
  不匹配，不要回退到 shell browser。
- 每个 `node_repl` JavaScript 调用都是新 kernel；每次都按 `control-browser` 重新 bootstrap，
  再用 `await agent.browsers.get("iab")`。
- 录像只接受 Browser Use SDK 的受限 action DSL，不执行任意页面脚本。
- `recording.status` 的 `outputPath` 必须是工作区内相对路径且以 `.webm` 结尾，例如
  `recordings/source-home.webm`；ZCode 只落 WebM，传 `.mp4` 会被拒绝 —— 转 MP4 是**录制之后**
  由 ffmpeg 单独做的一步，不要试图让 ZCode 直接输出 MP4。
- 转码必须真的调 ffmpeg 重编码成 H.264 MP4。禁止只把 `.webm` 改名成 `.mp4` 伪装格式 ——
  容器和编码不匹配，下游 `ingest_video` / `clip_video` 会解码失败或抽出错帧。
- 原始 `.webm` 转码后**保留**，作为原始录制证据；`.mp4` 是交付物。两个文件同名不同扩展。
- 因此 ffmpeg 是本 skill 的**硬依赖**（不再是可选后处理）。若 ffmpeg 不可用，先按
  `env-setup` 装好再继续；不要跳过转码直接交 WebM。

## 状态与时序

```text
URL
 │ tabs.new / goto / waitForLoadState
 ▼
同一 IAB WebView ── domSnapshot / screenshot 踩点
 │
 │ tab.recording.start({ actions, ... })  →  recordingId
 ▼
preparing → capturing → finalizing → completed
                              │
                              └─ recording.status(id, { outputPath })
                                                → 工作区 recordings/<name>.webm
                                                        │ ffmpeg -c:v libx264
                                                        ▼
                                                  recordings/<name>.mp4  ← 交付物
```

## 工作流

### 1. 踩点

1. 用 IAB 打开 URL，等待 `domcontentloaded`。
2. 用 `domSnapshot()` 识别可交互元素；视觉布局、canvas/WebGL、图标含义再用 screenshot。
3. 分屏滚动检查长页，记录稳定选择器。优先：`#id`、`[data-testid="..."]`、稳定属性，
   再考虑短 class 或文本 selector。禁止 `:nth-child()` 和靠猜的选择器。
4. 为每个控件记账：`click`、`hover-only`（导航/付费/外部副作用）、`skip`（原因）。

### 2. 编排录像

`tab.recording.start(options)` 支持：

- `viewport`: `{width,height}`，默认建议 `1280×800`
- `fps`: `1..60`，建议 `25`
- `maxDurationMs`: `1000..90000`
- `settleMs`: 开始录制后、动作前的静置时间
- `showCursor`: 是否叠加可见录制光标
- `actions`: 最多 500 个受限动作

动作格式：

```js
[
  { type: "wait", durationMs: 800 },
  { type: "move", x: 240, y: 300, durationMs: 500 },
  { type: "hover", selector: "[data-testid=hero-card]", durationMs: 500, delayAfterMs: 1000 },
  { type: "click", selector: "#theme-toggle", delayAfterMs: 1500 },
  { type: "type", selector: "#search", text: "motion", delayAfterMs: 500 },
  { type: "scrollTo", selector: "#features", durationMs: 900, delayAfterMs: 1000 },
  { type: "scroll", deltaY: 700, durationMs: 700 },
  { type: "wheel", deltaY: 240, times: 3, intervalMs: 120 },
  { type: "drag", path: [{x:100,y:300},{x:300,y:260},{x:500,y:320}], durationMs: 900 },
  { type: "waitFor", selector: "#result", state: "visible", timeoutMs: 3000 }
]
```

编排规则：

- 开头留 800–1500ms，保证入口动效完整入镜。
- 点击后留 1500–2500ms，让响应和最终状态都可读。
- pointer-coupled 效果要包含宽幅 `move`、静止和再次移动；hover 不是 click 的替代品。
- 长页按章节 `scrollTo`，每步不超过一个 viewport；sticky/parallax 再接 2–3 个渐进 `scroll`。
- canvas 创作工具用坐标 `move`/`drag`，每种工具/颜色/线宽留下不重叠样本。
- 不点击会跳出页面、花费账户余额、发消息/下单/注册或产生其它外部副作用的控件。
- `maxDurationMs` 是 runaway guard；总动作时长必须低于它，并留出加载余量。

### 3. 开始并轮询

在已核验的目标 tab 上开始：

```js
const job = await tab.recording.start({
  viewport: { width: 1280, height: 800 },
  fps: 25,
  maxDurationMs: 60000,
  settleMs: 1200,
  showCursor: true,
  actions,
});
job;
```

保存 `job.id`。在后续 fresh JS 调用中先恢复并核验同一个 tab，然后轮询；只有最后一次
status 传 `outputPath`，Host 才会把 main 临时产物落到当前 local/remote workspace：

```js
const job = await tab.recording.status(recordingId, {
  outputPath: "recordings/source-home.webm",
});
job;
```

- `running`: 根据 `phase`（preparing/capturing/finalizing）继续轮询。
- `completed`: 必须同时看到 `artifact.path`、`durationMs`、`frameCount`；该 WebM 是待转码的原始
  录制产物（不是最终交付物），并记下 `durationMs`/`frameCount` 供转码后核对。
- `failed`: 修正失败原因后最多重录两次。
- `cancelled`: 不可作证据；需要时调用 `tab.recording.cancel(recordingId)`。

### 4. ffmpeg 转 MP4

录制拿到 `.webm` 后，用 shell 跑一次 ffmpeg 转成 H.264 MP4；这一步是主流程的必经环节，
不是可选后处理：

```bash
ffmpeg -y -i recordings/source-home.webm \
  -c:v libx264 -preset veryfast -crf 20 \
  -pix_fmt yuv420p -r 25 \
  -movflags +faststart -an \
  recordings/source-home.mp4
```

各参数为什么是这样（改之前先想清楚）：

- `-c:v libx264` + `-pix_fmt yuv420p`: 下游 `ingest_video`/`clip_video` 与各家模型的视频输入
  对 H.264/yuv420p 支持最稳；VP8 与 yuv444 都可能被拒或解错。
- `-r 25`: **必须与录制时的 `fps` 一致**，作用是把输出固定成 CFR。录制产物的时间戳可能不均匀
  （VFR）；下游是按秒定位取帧（`still_crops(video,[t])`、trace 里的 `@t`），
  VFR 会让 seek 落到邻近帧上、时间轴与实际动作错位。输出侧给 `-r` 就够了，不要加 `-vsync cfr`
  （ffmpeg 6.1+ 已废弃并告警），也不要用 `-fps_mode cfr`（ffmpeg 4.x 不认这个参数）。
- `-an`: 录制无音轨，显式丢弃避免容器里留空音频流。
- `-movflags +faststart`: moov 前置，边下边解，供审片工具快速 seek。
- `-crf 20`: 视觉近无损。动效/渐变出现明显 banding 时可降到 18；不要为省体积上调到 28 以上，
  复刻要靠这段视频判断颜色和缓动。

转完必须核对一次，别把坏文件交下去：

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,width,height,nb_frames,r_frame_rate \
  -show_entries format=duration -of default=noprint_wrappers=1 \
  recordings/source-home.mp4
```

- `codec_name=h264`，`duration` 与录制回执的 `durationMs` 相差应在 ~0.5s 内。
- ffmpeg 非零退出、输出文件不存在或时长为 0 → 转码失败：报告 ffmpeg 的 stderr，不要交
  WebM 冒充 MP4，也不要改扩展名蒙过去。
- `.webm` 保留在原地，作为原始录制证据与转码失败时的回退。

### 5. 审片与交接

用 video MCP 的 `ingest_video`/`clip_video` 审查**转好的 MP4**（不是 WebM）：入口、滚动、
hover/click、pointer/canvas 动作是否清晰完整。交付 `recordings/<name>.mp4` 作为源视频；
若还要复刻，就以这个 MP4 连同 `video2code` + `web-replicate` 走原流程。

审片发现录像本身不合格（漏动效、时长不够、动作被截断）→ 回到第 2 步调整 action DSL 重录，
不要靠调转码参数补救，也不要安装 Playwright 作为旁路。若 MP4 能播但 video MCP 读不了，
先按上面 ffprobe 的输出定位是转码问题还是工具限制，如实报告。
