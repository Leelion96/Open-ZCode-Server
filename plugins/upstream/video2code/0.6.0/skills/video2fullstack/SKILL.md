---
name: video2fullstack
description: Replicating a website shown in an operation-recording video as a FULL-STACK project — frontend (layout, style, interactions, animations) AND a real backend (HTTP API + persistent storage) that reproduces the server-side behavior the video demonstrates (SKU/price coupling, cart persistence, validation, state transitions). Use whenever the task provides a screen recording of someone OPERATING a website (browsing, filtering, adding to cart, submitting forms) and asks to replicate it 复刻/复现 as a working full-stack app.
---

# video2fullstack — replicate a recorded website as a working full-stack app

Faithfully replicate the website demonstrated in the reference video. Two equally weighted goals:

1. **Frontend fidelity** — layout + visual style + real text content + interactions + animations, same as classic video2code.
2. **Backend fidelity** — the *behaviors* the video proves are server-driven must be served by a **real HTTP API with persistent storage** in your replica. A pixel-perfect page whose data is hardcoded in components is a FAILED task, no matter how good it looks.

The video is an **operation recording**: a user driving the site through a journey. Every observable consequence of an operation (price changes when a SKU is selected, an item appearing in the cart on another page, a validation error on submit) is evidence about the backend. Extracting that evidence is as much your job as reading the layout.

## Environment (read once, trust it)

- **Video**: 任务给出的源视频路径（mp4/webm 等；若任务给的是 http(s) URL，先按 `url2video` 录成 MP4）。No frames are pre-attached — 第一步用 video server 的 `ingest_video` 建接触表，消歧用 `clip_video`。
- **Project — you scaffold it (plugin mode, nothing is pre-created)**:
  1. **Frontend** via web-replicate: `bash <plugin_root>/skills/web-replicate/scripts/init-webapp.sh "<site-title>"` → creates `app/` (React + TS + Vite + Tailwind v4 + shadcn/ui, common libs preinstalled). `<plugin_root>` is in `.v2c/plugin_root`. Fill `app/src/` with the real pages; **fetch all dynamic data from `/api/*`** (relative paths).
  2. **Backend** you add on top, single process serving the built frontend + API:
     - `cd app && npm install express better-sqlite3`
     - `app/server/db.mjs` — open better-sqlite3 at `server/data/app.db`, `db.exec(...)` your tables.
     - `app/server/routes.mjs` — the business routes the video shows (GET reads, POST/PATCH/DELETE writes) under `/api`.
     - `app/server/seed.mjs` — real data from the video (products/prices/stock rules/…); runnable `node server/seed.mjs`.
     - `app/server/index.mjs` — `express.json()` → `app.use('/api', routes)` → `express.static('dist')` → SPA fallback; `PORT||3000`.
     - `app/package.json` scripts: `"build":"vite build"`, `"start":"node server/index.mjs"`, `"seed":"node server/seed.mjs"`.
  3. **Run for verification**: `npm run build && npm run seed && npm start`（后台 bash 起服务，别占住前台 shell）→ single server on `:3000` serving real pages whose data all comes from `/api/*`。
- **Frame extraction / disambiguation**: use the video server 的 `clip_video`（差分选帧）而不是手写 ffmpeg — 选"能证明一个行为"的帧它更准。
- **Verification tooling — ZCode 内置浏览器那一套（硬约束）**: 必须同时使用 ZCode 官方 `control-browser` skill（完整遵守其 bootstrap、backend 选择、tab 恢复和页面安全规则；每个 `node_repl` 调用是新 kernel，都要重新 bootstrap 后 `await agent.browsers.get("iab")`），用同一个 IAB WebView 打开 `http://localhost:3000` 重演视频旅程：`domSnapshot()`/`tab.screenshot()` 断言状态、`tab.recording.start()` 拍动效；API 叉用 `curl`。跨刷新断言 = 重新 `goto` 同一 URL（或 `tab.playwright.reload()`），等 `domcontentloaded` 后再 domSnapshot/screenshot —— 必须看到后端持久化的状态。**没有 `browser_*` MCP 工具；不要安装/启动 Playwright、Chrome 或其它外部浏览器。**
- **Contract files** live under `out/`（当前项目目录）。Graded on `out/plan.md`, `out/verify.jsonl`, `out/report.md` plus the shipped `app/`。

## Stack — one server process, boring choices

| Layer | Use | Notes |
|---|---|---|
| Frontend | React + TypeScript + Vite + Tailwind | same as video2code; framer-motion/gsap only if the motion needs it |
| Backend | Node: **Express** (or Hono) | plain REST JSON API under `/api/*` |
| Storage | **better-sqlite3**; fallback: a JSON file store you flush on write | if better-sqlite3 fails to build in this container, do NOT burn rounds — fall back immediately. The requirement is *server-side persistence across page reloads*, not a specific engine |
| Serving | **ONE process**: the API server also statically serves the built frontend (`dist/`) | `node server/index.mjs` listens on **port 3000**, serves `/api/*` + static files + SPA fallback |

Frontend components get ALL dynamic data from `/api/*` via fetch — products, cart, orders. Seed data lives in the database (a `seed` script or auto-seed on first boot), never inline in JSX. Hardcoding into components what the video shows coming from a server is the defining anti-pattern of this skill.

## File contract — what "done" means

| File | What | When |
|---|---|---|
| `out/plan.md` | Design spec. Every observable concern is one line tagged `[S#]` (static) / `[D#]` (dynamic) / `[B#]` (backend behavior), with measured numbers and source timestamps. Plus a **Backend design** section: entity tables, API endpoint list, seed-data plan. | End of Phase 3, **before any app code** |
| `out/verify.jsonl` | Append-only log, one JSON object per check: `{"id":"B2","result":"pass"|"fail"|"defer","evidence":"<path or command>","measured":{...},"reason":"<required for fail/defer>"}`. Fixes append a new line for the same id; never edit old lines. | Live during Phase 4 |
| `out/report.md` | What shipped, how to run it (`npm install && npm run build && npm start`), API summary, deferred list with reasons. | Last act |

Done = every `[S#]`/`[D#]`/`[B#]` id in plan.md has a final `pass`/`defer` line in verify.jsonl, `npm run build` passes, the server starts and answers, and report.md exists. Never `defer` a check you did not attempt.

## Video tooling

- **Base strip (Phase 1, mandatory first move)**: `ingest_video(<源视频>)` — 拿全片接触表，然后**按时间顺序逐帧读完**（与 video2code Phase 1 同一约定）。Long videos: read in batches with notes; never skip a region of the timeline.
- **Dense clip at a moment**: `clip_video`，把 Phase-1 的每个疑点和行为转换点拉成密集帧网格。≤8 clips per task.
- **Grouped small assets (icon strips, sticker/emote grids, avatar rows)**: when the video shows a SET of small artworks, find the frame where the set is fully and crisply visible, compute the grid geometry once, and crop EVERY cell from that frame in a loop — `still_crops(<源视频>, [t], crop=[x,y,w,h])` 逐格取（cells occluded or hover-zoomed in that frame → take it from a neighboring frame）。Redrawing such artwork as generic shapes/solid fills is a graded-run rejection — the photograph rule applies at every size: real pixels from frames, never approximations.
- **Asset crops**: crop real photos/logos out of source frames at full resolution — `still_crops(<源视频>, [t], crop, scale, save_to=...)`（asset 模式落 `public/assets/` 并记 provenance；返回 `/assets/...` 路径供 JSX 引用）— Read the result to confirm, adjust, re-crop. Never redraw a photograph; never hotlink; real copy from frames, never lorem ipsum.

## Viewport & proportions

- Detect the recording's device pixel ratio BEFORE planning: a video ≥2300px wide showing OS window chrome is almost always a 2× HiDPI capture — the real CSS viewport is video_width/2. State the deduced CSS viewport in plan.md as `[S0]`, and design + verify at that CSS width（IAB 侧用 `setViewportSize` 对齐）。
- The video proves the layout at ONE width only. Outside it, follow the platform's natural responsive behavior (fluid/masonry feeds change column count; centered containers keep a max-width with balanced margins). Freezing the recorded pixel width as the only layout — so any other window size overflows or strands the content in a sliver — is a rejection. Mark extrapolations in plan.md as such.

## Workflow — strict order

### Phase 1 — Observe (page AND behavior)

`ingest_video` 拿接触表，按时间顺序 Read 全部帧，then write in your message:

```
## Video observation
<3–6 sentences: site type, visual style, pages visited, core interactions>

## Behavior observation
**Journey**: numbered list of the user's operations with timestamps
  1. (~0–8s) browse home, hover category menu → flyout panel
  2. (~13s) open product page, select SKU 12+256GB → price shows 3599
  ...
**Entities**: the domain objects the journey proves exist (product, SKU, cart item, order...), with the fields visible on screen
**State transitions & couplings**: every moment where an operation changed data that a server must own
  - SKU selection ↔ price/stock (t≈37s: 512GB → price 3899)
  - add-to-cart on page A ↔ cart contents on page B (t≈45→53s)
  - submit without address → validation error modal (t≈62s)

**Ambiguities to clip in Phase 2** (or "- (none)"):
```

Multi-page journeys → build a multi-page app (client-side routing, one route per page); list the routes.

### Phase 2 — Clip

One dense `clip_video` per Phase-1 ambiguity, per `[D]` candidate, **and per state transition you plan to tag `[B]`** (the frames around the click are the evidence of what exactly changed). Priorities: state transitions > animations > hover states.

### Phase 3 — Plan (`out/plan.md` before any code)

```
# Plan — <site>
## Layout strategy
[S1] ...
## Design tokens
[S2] Colors: ...
## Interactions & animations
[D1] Category flyout on hover: ... (clip 2.0–4.0s; CSS)
## Backend design            ← NEW, load-bearing
Entities: product(id,name,price,...), sku(id,product_id,variant,color,price,stock_by_region)...
API: GET /api/products?category=&sort=  GET /api/products/:id
     GET/POST/PATCH/DELETE /api/cart    POST /api/orders (validates address)
Seed: 4+ products with the SKUs/prices/stock states visible in the video
## Backend behaviors
[B1] SKU selection re-prices from server data: 12+256GB=3599, 12+512GB=3899 (t≈21s vs 41s)
[B2] Region-dependent stock: silver variant → "缺货"/notify button (t≈33s)
[B3] Cart persists server-side: add on product page → cart page lists it → survives full reload (t≈45–53s)
[B4] Order submit without address → server rejects with "请选择地址!" (t≈62s)
```

Tag rules:
- `[S]`/`[D]` rules are unchanged from video2code: one frozen frame can prove it → `[S]`; truth lives in coupling to time/scroll/pointer → `[D]`. Doubt → `[D]`.
- **`[B]` test: where does the truth live?** If the behavior is about *data* — its value, its persistence, its validation, its consistency across pages — it is `[B]`, and the truth must live **on the server** in your replica. A thing can be both `[D]` (the animation) and `[B]` (the data change); tag both.
- Every entity/coupling named in the Behavior observation maps to ≥1 `[B#]` line. Silent omission = failure.
- `[S#]`/`[D#]`/`[B#]` are three independent gapless sequences; every line cites its source timestamp(s).

### Phase 4 — Build, run, verify

**4.1 Seed todos** — one write, all pending: build todos (scaffold app+server / seed db / assets / pages / interactions / build / server boot) → one `verify-S#`/`verify-D#`/`verify-B#` todo per plan tag → `summary-final`.

**4.2 Build** — the scaffold at `app/` is ready; fill in backend contract first (tables in `db.mjs`/`seed.mjs` + routes in `routes.mjs`), then frontend pages against it. Incremental edits, parallel Writes for independent files. Then:
1. `cd app && npm run build` — must pass (no `npm create`/`npm install` needed unless you added a package).
2. Boot the real thing — 后台起服务（`run_in_background` 的 bash 跑 `node server/index.mjs`，日志落 `/tmp/server.log`），然后 `curl -s http://localhost:3000/api/health` 和 `curl -s http://localhost:3000 | head -30` — API answers AND built frontend is served.
3. 按 `control-browser` 用 IAB 打开 `http://localhost:3000`，等 `domcontentloaded`，`domSnapshot()`/`tab.screenshot()` 确认可达与视觉状态。

**4.3 Verify sweep — one id at a time, fixes deferred and batched:**
- `verify-S*`: 在同一 IAB tab 里走到对应页面/状态 → `tab.screenshot()`，与源帧对比（要出正式对照证据就用 `composite_view(source=<源帧>, replica=<截图>)`）。The pass line must carry a `diffs` array naming the discrepancies you found (or `[]` **after** stating what you compared: layout boxes, colors, copy, counts). A pass that names nothing and compares nothing is invalid — graded runs reject it.
- `verify-D*`: capture the MOTION — `tab.recording.start({ actions, ... })`（编排规则同 video2code §4.5：`scrollTo` 定位 + ≤1 屏的 `scroll` 步拍 coupling、`move` 做 sweep、settleMs/delayAfterMs 留静置），录成 WebM 后 `still_crops(recording, [t...])` 取节拍帧，与源 clip 并排（`composite_view` beats 一条命令出 SRC|REP strip）。End-state screenshot alone never passes a `[D]`.
- `verify-B*`: evidence must be **server-side, two-pronged**:
  1. **API prong**: `curl` the endpoint and show the data (`curl -s localhost:3000/api/cart` after an add-to-cart shows the item; a POST with a missing field returns the 4xx + error body).
  2. **Journey prong**: 同一 IAB tab 用 Browser Use 动作（snapshot-proven locator / `tab.cua`）重演视频里的操作，并断言后果**跨整页刷新**（重新 `goto` 同一 URL 或 `tab.playwright.reload()` — fresh JS context）或跨页面仍然成立：`domSnapshot()`/`tab.screenshot()` 里要看到数据还在，e.g. add to cart → goto /cart → item present → reload → still present.
  - **What can never pass a `[B]`**: component state, props, localStorage, a mocked fetch, data compiled into the bundle. If killing and restarting the server would lose the state *and* the video shows it persisting, it's a fail. If the frontend renders it but `/api/*` never returns it, it's a fail.
- One JSON line appended per judged check, at the moment of judgment; `fail` → `pass` only with fresh evidence from this fix round; ≤2 fix rounds then `defer` with reason. Never fabricate evidence you did not capture.

**4.4 Coverage pass (mandatory — your plan is not the ground truth, the video is):**
Re-Read ~12 evenly spaced contact-sheet frames asking one question per frame: *"what UI surfaces or entry points are visible here that no plan tag covers?"* Nav items, icon buttons (a grid icon opening a launcher panel!), badges, dropdowns, modals, footer columns all count. For each untagged finding: append a new `[S/D/B]` line to plan.md (appending at this stage is expected, not a failure) and verify it like any other id, or `defer` it with a reason. Then append `{"id":"COV1","result":"pass","measured":{"frames_reviewed":N,"new_tags":[...]}}`. The real-run failure this exists to catch: the video flashes an icon that opens a 9-app grid; the replica ships without the entry point and every planned check still passes.

**4.5 Contract sweep (mandatory, mechanical):**
`grep -rhoE '"/api/[A-Za-z0-9_/${}:.-]*"' app/src | sort -u` → for every path the frontend fetches, `curl` it (with a plausible id where parameterized): **non-404, JSON**. Reverse direction: every route in `routes.mjs` is either fetched by the frontend or listed in report.md as API-only. Append `{"id":"C1","result":...,"measured":{"frontend_paths":[...],"unserved":[...],"unfetched":[...]}}`. Any frontend fetch that 404s is a `fail` you must fix — endpoint-name drift that silently renders empty UI is the #1 observed real-run failure of this skill.

**4.6 Close-out** — every id final (including COV1 and C1) → write `out/report.md` (shipped summary, run instructions, API table with seed row counts, deferred list) and stop.

## Anti-patterns (graded-run rejections)

Frontend ones (unchanged from video2code): coding before observation/plan; ambiguities "(none)" while the video clearly has motion; visible effects never tagged; `[S]`-tagging scroll/pointer couplings; lorem ipsum; broken/hotlinked images; build failing at close-out; verifying `[D]` with an end-state screenshot; claiming verification you didn't perform.

Backend ones (new, and the reason this skill exists):
- **The pure-frontend cop-out**: shipping a beautiful SPA where products/cart/orders are hardcoded arrays or localStorage. That is a failed task even if every `[S]`/`[D]` passes.
- Data in JSX/TS constants instead of the database seed; components that don't fetch.
- An "API" that only has GET routes when the video shows writes (add to cart, submit order).
- Validation done only in the browser when the video shows a server-style rejection — the API must enforce it too (the curl prong catches this).
- `[B]` verified with a screenshot only — no curl prong, no reload prong.
- Skipping the server boot check and shipping `dist/` as if this were a static-site task.
- Inventing backend features the video never demonstrates (auth flows, admin panels) — replicate the evidence, don't pad the scope.
- Closing out without the coverage pass (4.4) or contract sweep (4.5) — "all my planned checks pass" is not "the video is replicated"; the checklist you wrote is not the ground truth, the video is.
- Redrawn substitutes (generic SVG / solid fills) for artwork visible in frames — at any size, including grouped small assets (sticker grids, icon strips, avatars).
- Hard-coding the recorded width as the only layout, or designing at the physical (2×) pixel width of a HiDPI capture.
- Frontend `fetch()` paths that 404 against your own server (endpoint-name drift) — the UI renders empty and every screenshot still "passes".
