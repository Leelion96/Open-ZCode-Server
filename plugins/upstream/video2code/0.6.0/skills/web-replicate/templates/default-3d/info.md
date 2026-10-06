Using Node.js 20, Tailwind CSS v4, Vite v7 — plus three.js r0.160 for WebGL/3D.

This is the **default-3d** template: the standard React+TS+Vite+Tailwind+shadcn app
(same as `default`) AUGMENTED with a three.js 3D skeleton. Use it for WebGL pages
(3D perspective, particle fields, volumetric light/glow, camera flythroughs, shaders).
For flat 2D pages use the `default` template instead.

Preinstalled for 3D (do NOT reinstall): three@0.160, simplex-noise, @types/three.
NOT installed (by design): gsap, react-three-fiber — use raw three.js in the scene.

════════════════════════════════════════════════════════════════════════════════
 THREE LAYERS — know which you may touch
════════════════════════════════════════════════════════════════════════════════

  src/three/Stage.tsx          Mount component: canvas + renderer lifecycle, rAF loop,
                               resize, pixelRatio, StrictMode guard. DO NOT rewrite.

  src/three/engine/core/       FROZEN, reused by every 3D page — DO NOT rewrite:
    renderer.ts                  WebGLRenderer factory (pixelRatio<=1, sRGB, ACES)
    loop.ts                      rAF ticker, wall-clock (getElapsedTime) + clamped dt
    signals.ts                   scroll->t (0..1) + pointer->(-1..1), rAF-polled
    rng.ts                       mulberry32 seeded RNG (reproducible)
    forensic.ts                  URL hooks: ?t=<0..1> freeze / ?freeze / ?lite / ?autodemo

  src/three/engine/kit/        OPT-IN per archetype — use what you need, ignore the rest:
    cameraRig.ts                 spline flythrough (CatmullRomCurve3) + orbit controls
    beats.ts                     BEAT-table math primitives: clamp01/smoothstep/remap,
                                 lerpFields (number+THREE.Color), createSplinePair.
                                 The BEAT table itself (stations/keyframes) is YOUR scene code.
    hudBridge.ts                 createHudStore<T>() — scene→React pub/sub for HUD values;
                                 you define the state fields (generic T)
    composer.ts                  EffectComposer + UnrealBloom + OutputPass (bloom starter)
    model.ts                     GLTFLoader (+DRACO) + neutral environment (product/model)
    text.ts                      FontLoader + TextGeometry (3D text)

  src/three/scene/Scene.ts     ★ YOUR WORK. SceneModule interface + a PLACEHOLDER scene
                               marked "REPLACE ME". Delete the placeholder and write the
                               scene that matches the video (particles/shader/geometry/
                               materials/BEAT). This is where the real 3D coding lives.
  src/three/scene/contract.ts  Type re-export: `import type { SceneModule, SceneContext }
                               from './contract'` in your scene modules.

  src/three/hud/Hud.tsx        2D overlay (Tailwind, pointer-events:none) — nav/text/labels.
  src/pages/Home.tsx           Assembles <Stage/> + <Hud/> + scroll spacer.

The SceneModule contract Stage depends on:
  init(ctx) / update(t, dt) / render?() / resize?(w,h) / dispose()
  ctx = { renderer, scene, camera, clock, sizes, rng, signals, forensic }
Stage does NOT assume you use a camera path or composer — a raymarch page can use only
core + a fullscreen quad and drop every kit module.

Recipes (particle morph, bloom starter params, spline+BEAT camera, shader snippets),
software-render survival budget, material-downgrade table, and the 3D verify additions
live in the **video2code-3d** skill. Load it for any WebGL page.

Standard app structure (unchanged from default):
  src/components/ui/   50+ shadcn/ui components     src/lib/   shared utils
  src/hooks/           custom hooks                 src/index.css  Tailwind theme
  import { Button } from '@/components/ui/button'
