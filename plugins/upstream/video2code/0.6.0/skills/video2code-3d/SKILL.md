---
name: video2code-3d
description: 3D/WebGL extension for the video2code workflow. Load this ADDITIONALLY (a third Skill call, alongside video2code + web-replicate) whenever the reference page is a WebGL/three.js scene — true 3D perspective/depth, particle fields, volumetric light or glow, shader backgrounds, camera flythroughs, or raymarched fractals. It routes you to the `default-3d` template and gives the effect-recipe library, the no-GPU software-render survival budget, and the 3D-specific verification rules. Raw three.js only; never react-three-fiber, never a hand-rolled canvas-2D pseudo-3D engine, and never the source recording's own pixels as the scene.
---

# video2code-3d — replicate a WebGL/3D page

Extends the base `video2code` workflow for WebGL pages. **The whole point: don't rewrite the
engine, write the scene.** The `default-3d` template already ships a correct renderer / rAF
wall-clock loop / `scroll→t` / camera rig / post-processing / forensic hooks. Your job is the
*content* — the particles, shaders, geometry, materials, and camera choreography that match THIS
video. That content is exactly the coding this task exists to exercise; the engine is not.

## 0. You are here because Phase-1 observation saw a WebGL page

The signal list lives in base `video2code` Phase 1 (**WebGL / 3D pages**) — any one signal is
enough. Being here means you **must** have **(a)** loaded this skill and **(b)** scaffolded with
`init-webapp <title> default-3d`. If you already scaffolded plain `default`, re-run init-webapp
with `default-3d` — this is not a preference. The close-out audit fails a run whose plan calls the
page WebGL while `app/package.json` carries no `three` dependency, because that combination has
exactly one meaning: the scene was never built. "I decided I didn't need a three scene for this
one" is not a route out of the 3D template; it is the decision this skill exists to prevent.

**Hard rules:**
- **Raw three.js only.** No react-three-fiber / drei — it diverges from the recipes below.
- **NEVER build a canvas-2D pseudo-3D engine** (hand-rolled perspective projection, fake depth
  sorting). This is the #1 quality failure. If it reads as 3D on screen, use three.js.
- **NEVER ship the source's own rendered pixels as the scene** (backdrop clip, frame sequence,
  blitted frames). See *The scene layer is always `{render}`* below — this one voids the task.
- Card flip / slight tilt / parallax that a single CSS `transform: perspective()` covers is **not**
  a WebGL page — stay in base `video2code`, don't pull in three.

## 1. Selection table — observed effect → approach

| Observed | Approach | Module |
|---|---|---|
| 3D objects/particles in perspective | three.js scene | `scene/Scene.ts` |
| Particle field, points swarming/morphing | particle recipe (§2) | `scene/particles.ts` |
| Volumetric light / bloom / glow | EffectComposer + UnrealBloom + fog | `engine/kit/composer.ts` |
| Camera flies along a path (scroll-driven) | spline cam + BEAT table | `engine/kit/cameraRig.ts` |
| Product / real 3D model, orbitable | GLTF load + orbit controls | `engine/kit/model.ts` |
| Shader background / gradient / aurora / fluid | fullscreen quad + ShaderMaterial | `scene/` + `shaders/` |
| Infinite-detail fractal zoom | raymarch fullscreen quad (advanced) | `scene/` + `shaders/` |
| Card flip / slight 3D tilt | CSS 3D transform — **not three** | back to base skill |

## 2. Effect recipes — copy the PATTERN, author the video-specific parts

Frequency from the corpus census (`docs/site_corpus_census.md`). Recipes give the known pipeline
so you copy a proven approach instead of reverse-engineering it from video — but count, shape,
colour, and timing are yours to read off the frames.

**Particle morph (85% of pages) — the flagship.** Reverse-engineering this from video is nearly
impossible; the corpus universally does:
```
// 1. draw the target shape/text to an offscreen 2D canvas
// 2. sample its pixels → array of target positions (xyz)
// 3. each particle lerps from a seeded random start toward its target, + simplex noise drift
// count: read density off the video. corpus median ~thousands, p90 ~40k. Start ~8–12k, scale to fit.
```
Use `ctx.rng()` for reproducible starts, `simplex-noise` (preinstalled) for drift.

**Bloom starter (42%).** In `scene.init`: `const { composer } = createBloomComposer(renderer,
scene, camera, { strength: 0.8, radius: 0.4, threshold: 0.85 })`; override `render()` to
`composer.render()`. Tune the three numbers to the video's glow.

**Spline camera + BEAT (46%).** Camera state is a **pure function of scroll progress t**, not a
GSAP timeline (corpus uses 0 gsap):
```
const { camPath, lookPath } = createSplinePair([...Vector3], [...Vector3])  // engine/kit/beats
// per frame: camera.position.copy(camPath.getPoint(u)); camera.lookAt(lookPath.getPoint(u))
// beatAt(t) is a pure function mapping t→{camera, light phase, active mode,...} — a hardcoded
// BEAT table YOU author from the video's stations. kit/beats gives the math primitives
// (clamp01/smoothstep/remap/lerpFields); the table's stations, keyframes, and how phases
// stack/switch are video-specific — write them in scene/beats.ts.
```
This is fps-independent and lets `?t=` freeze any beat for verification. Scene values the HUD must
display (readouts, probe hits, active chapter) go through `createHudStore<T>` (engine/kit/hudBridge);
you define the fields.

**Shader snippets.** Put GLSL in `scene/shaders/*.glsl`, import as strings. Common families:
glitch/RGB-shift (25%), fbm (23%), simplex noise (10%). **Raymarching (6%)** = fullscreen quad +
SDF in the fragment shader; if the video shows infinite-detail zoom, raymarch it — do NOT
approximate with stacked geometry.

**fog (39%) & seeded RNG (64%)** — fog is a two-liner (`scene.fog = new THREE.FogExp2(...)`);
RNG is already `ctx.rng`.

**Material & lighting starter (PBR-heavy demo/product pages).**
`scene.environment = createNeutralEnvironment(renderer)` (engine/kit/model: RoomEnvironment+PMREM)
gives MeshStandard/Physical materials plausible reflections with no HDRI file. Add three lights
(warm key / cool rim / accent point — corpus median is 1 directional + 0–2 points), enable
`renderer.shadowMap` with `castShadow/receiveShadow` only on the meshes that visibly need it, and
a `Reflector` plane only when the source shows a real mirror floor. Intensities, colours and
roughness are yours to read off the frames; on the software tier fall back per §3's downgrade table.

**Procedural machine / exploded view (product-demo pages).** No model asset exists in this
environment — build the object from primitives (Box/Cylinder/Torus/Lathe/Extrude) composed in
`Group`s, one group per part. An exploded view is then a pure function of progress: each part
group translates outward along its assembly axis (`lerpFields` on position), driven by scroll-t
or time. Sources of this kind build their "models" exactly the same way — parity is reachable;
never substitute a screenshot for the object.

**Dot globe (data-viz pages).** A photo-textured earth needs a texture asset that does not exist
here. Build the mainstream dot-globe instead: points distributed on a sphere (lat/lon grid or
fibonacci spiral), highlighted points/arcs for data locations, slow Y rotation. If the source is
unmistakably a photo-textured globe, build the dot version at matched framing and take the
texture gap in Known-gaps (the out-of-reach route below).

## 3. Render tier & the software-render survival budget (read BEFORE writing code)

The verification browser is either **hardware-GL** (GPU batch — WebGL at real-time fps) or
**software-rendered** (SwiftShader, ~1.5–20 fps). Tell them apart from your first capture: a
recording that plays back smooth and real-time = hardware GL; single-digit janky fps = software.
Write for the software case from frame one — the same code must survive both:
- **Wall-clock drive everything** off `dt`/elapsed (the loop already clamps dt) — never advance by
  frame count. Physics: integrate `dt` in fixed substeps inside `update`.
- **pixelRatio ≤ 1** (already set); honour `ctx.forensic.lite` → antialias off, particle count
  halved, skip heavy post-processing.
- **Material downgrade table** (source look → cheap stand-in): `MeshPhysicalMaterial` /
  `iridescence` → `MeshStandardMaterial` + a phase-based colour shift; parallax/normal-heavy PBR →
  baked colour + rim light. Note the downgrade in `out/report.md` Known-gaps.
- Expect low fps in verification; **never gate correctness on fps or on animation-stability checks.**

## 4. Scaffold map (default-3d) — what you may touch

- `src/three/Stage.tsx` + `engine/core/*` — **FROZEN, do not rewrite** (renderer, rAF wall-clock
  loop, `scroll→t`+pointer signals, seeded rng, `?t/?freeze/?lite/?autodemo` forensic hooks).
- `engine/kit/*` — **opt-in**: cameraRig / beats (BEAT-table math primitives + `createSplinePair`) /
  hudBridge (`createHudStore<T>` scene→React) / composer / model / text. Use what the archetype
  needs, ignore the rest. A raymarch page may use none of them.
- `scene/Scene.ts` — **YOUR WORK**. Implement `SceneModule { init(ctx)/update(t,dt)/render?()/
  resize?()/dispose() }`. `ctx = { renderer, scene, camera, clock, sizes, rng, signals, forensic }`.
  Delete the `PlaceholderScene`.
- `hud/Hud.tsx` — 2D overlay (Tailwind, `pointer-events:none`), **fixed chrome only** (logo, nav,
  telemetry, scroll pill). Content that moves with scroll — hero copy, chapter cards — lives in the
  scroll flow under `pages/` (a scrolling layer over the fixed canvas), never in the fixed HUD:
  faking scroll by animating fixed-position elements reads wrong and forces a mid-verify rework.
  `pages/Home.tsx` — assembly + scroll spacer (set its height to your number of scroll chapters).

## 5. Write large scenes in chunks — hard limits

Output truncation killed 34/48 pre-template 3D tasks and still costs a **full wasted round** each
time it happens. These are binding rules, not style advice:

- **At most ONE file >200 lines per turn.** Other calls in that turn must be small edits/reads.
- **Any file that would exceed ~350 lines: never emit it in one Write.** Write the skeleton first
  (imports, types, class/function shells), then fill one system per `Edit` in later calls.
- Split the scene into modules (`scene/particles.ts`, `scene/shaders/*.glsl`, `scene/beats.ts`) —
  one system per file keeps every write under the limits naturally.

## Phase 4 — verify (3D additions/overrides to base §4.2/§4.4)

Base Phase 4 verify still applies; 3D changes these rows:

- **verify-D — evidence by render tier.**
  - **Hardware GL** (your recordings play back real-time): recordings are the **primary motion**
    evidence — they prove motion, easing, burst/regather rhythm, and reversibility in one artifact,
    and one recording usually settles several ids. But a replica-only recording cannot **close** an
    id (base §4.2): pin matched beats with `?t=<0..1>` stills against the source clip's frames at
    the same beats into SRC|REP composites under `out/cmp/`, cite the composite, keep the recording
    as the supporting path.
  - **Software render**: freeze, don't (only) record — recordings are janky and unreliable. For
    each BEAT, drive the page to it with **`?t=<0..1>`** (deterministic freeze), screenshot, and
    compare to the source frame at that beat. Use a recording only for genuine transitions that a
    still can't prove.
  - `?t=` freezes the **scene** only — DOM chapter cards / hero fades follow real scroll. For the
    full-frame anchor composites (base §4.4) scroll the page for real to the chapter, so the frame
    carries both the scene state and the DOM state the viewer would see.
- **Shared parameters are not shared pixels.** Anchor and figure verdicts follow the base §4.2
  difference scan; for 3D scenes one shortcut is explicitly banned — the same mode/config numbers
  driving both sides (often printed in the source's own HUD) say nothing about whether the rendered
  figures match. Pattern/figure geometry — ring vs spoke vs ridge structure, regular vs irregular,
  crisp vs diffuse, how many of each — is read off the composite only.
- **New render-tier parity check.** If the source is volumetric light / true 3D perspective / PBR
  and your replica is a flat gradient / 2D displacement / painted approximation → **Tier-1 FAIL**,
  even if layout and text match. Structural-match alone does not pass a 3D `[D]` row.
- Use `?lite` for stable capture; `?freeze` to hold a single frame.

## The scene layer is always `{render}` — no exception, at any fidelity

Base Phase 1 classifies every moving region `{render}` or `{footage}`. **A WebGL scene is
`{render}` by definition**: the source computes those pixels every frame, so your replica must
compute them too. There is no photorealism threshold above which the answer flips.

Concretely barred for the scene layer, however it is dressed up: an mp4/webm/gif backdrop cut from
the source recording, a numbered frame sequence played back, source frames blitted through a
canvas, a `<video>` behind a transparent DOM/SVG layer. **Doing this voids the task** — not a
Tier-1 `fail` on some rows, a **Tier-0 void** on the whole run: nothing downstream of it means
anything, because the artifact contains none of the work the task exists to exercise.

**One legitimate seam — a `VideoTexture` whose content is itself footage.** Real sites sometimes
play a video file *as a texture inside* the scene (a screen, a poster, a backdrop plane). The
scene layer stays `{render}` — the geometry, camera, lighting and the texture's carrier mesh are
yours to write — but that texture's content follows the base `{footage}` rules: declare it on its
plan line with the source clip range and `asset=`, ship the clip as the texture source, and let
the audit reconcile it. This is footage material *inside* a rendered scene — not the barred move,
which is shipping the scene's own rendered pixels.

**Two arguments will occur to you on a hard source. Both are wrong:**

- *"The source's own rendered pixels aren't a flat gradient or a painted approximation — so the
  render-tier check above doesn't bite."* True as written, and irrelevant. That check enumerates
  bad **substitutes for rendering**; it presupposes you rendered. Replaying the source is not a
  worse render, it is the absence of one, and it is **further** from passing than the crudest
  hand-authored scene, not closer.
- *"Video backdrops make the SRC|REP composites nearly pixel-identical, so they score better."*
  Also true, and the reason this is barred rather than merely discouraged. The composite is a
  proxy for having rebuilt the scene; the source's own pixels beat every honest rebuild on that
  proxy while containing zero of the thing it proxies for. A perfect score obtained this way is
  the signature of the failure, not evidence against it.

**What to do instead when the source is genuinely out of reach** — photoreal underwater
environments, crowd simulations, thousands of animated agents, film-grade lighting. Author the
scene at the fidelity you *can* reach: right archetype (particles / raymarch / spline camera),
right depth cues, right palette, right motion character and rhythm. Then take the shortfall
honestly in `out/report.md` Known-gaps ("source is a photoreal reef with ~thousands of fish; the
replica is a stylised particle field at matched density and drift"), and let the affected rows
carry their Tier-2 `fail`/`defer` with the measured delta. **A visibly rougher scene that you
wrote is a completed task. A pixel-perfect replay is a void one.** The material-downgrade table in
§3 is the same principle at component scale — downgrade, disclose, ship.

**3D model assets follow the same ladder — there is nothing to load.** This environment ships no
GLTF, no HDRI, no texture files, and no network; `kit/model` only earns its keep when a task
supplies an asset. Mechanical / geometric / low-poly subjects: build them procedurally
(primitives + groups — §2's machine recipe); that IS the task, not a fallback. Organic or
photoreal subjects: author the stylised approximation and take the gap in Known-gaps. Skeletal
character animation: never attempt rig-level fidelity in code — approximate at the transform
level (whole-figure motion) and defer the rest honestly.

## Anti-patterns (3D-specific, on top of the base list)

- A hand-rolled canvas-2D pseudo-3D engine, or reaching for react-three-fiber / gsap.
- **Cutting scene backdrops out of the source recording and layering DOM/SVG chrome over them** —
  the void, whatever the report calls it. Its tells: an ffmpeg `delogo` chain scrubbing the
  source's own baked-in HUD out of a clip you are about to ship; hunting the recording for a
  "text-free window" to loop; a "render-tier decision" section in `plan.md` arguing why this
  source is unauthorable.
- Scaffolding plain `default` on a page Phase 1 called WebGL, to avoid the three scene.
- Rewriting `engine/core` instead of writing the scene.
- Approximating a volumetric/raymarched source with stacked flat geometry and calling it done.
- One giant scene write → output truncation.
- Passing a `[D]` row with a flat 2D fake of a volumetric/PBR source (render-tier fail).
- Passing a particle figure / shader pattern because both sides run the same mode or config
  numbers — two renderers given identical parameters draw entirely different figures; judge the
  pixels (base §4.2 scan).
- Advancing animation by frame count, or gating correctness on the software-renderer's fps.
