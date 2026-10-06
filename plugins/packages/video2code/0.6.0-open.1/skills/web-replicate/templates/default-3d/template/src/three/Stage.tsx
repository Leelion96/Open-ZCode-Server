import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createRenderer } from './engine/core/renderer'
import { createTicker } from './engine/core/loop'
import { createSignals } from './engine/core/signals'
import { createForensic } from './engine/core/forensic'
import { mulberry32 } from './engine/core/rng'
import { createScene, type SceneContext } from './scene/Scene'

// ── Stage: 3D 挂载点 (引擎 core, 禁改) ──────────────────────────────────────────
// 负责 canvas / renderer 生命周期、rAF 循环、resize、pixelRatio、StrictMode 双挂载防护,
// 每帧算出 t (scrollT 或 ?t 覆盖) 与 dt, 交给 SceneModule。复刻只改 scene/Scene.ts, 不改这里。
export default function Stage({ seed = 1337 }: { seed?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false

    const forensic = createForensic()
    const renderer = createRenderer(canvas, { antialias: !forensic.lite })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    const clock = new THREE.Clock()
    const signals = createSignals()
    const rng = mulberry32(seed)

    const ctx: SceneContext = {
      renderer,
      scene,
      camera,
      clock,
      sizes: { width: window.innerWidth, height: window.innerHeight, dpr: renderer.getPixelRatio() },
      rng,
      signals,
      forensic,
    }

    const mod = createScene()
    void Promise.resolve(mod.init(ctx))

    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      ctx.sizes = { width: w, height: h, dpr: renderer.getPixelRatio() }
      mod.resize?.(w, h)
    }
    window.addEventListener('resize', onResize)

    const ticker = createTicker(clock, (_elapsed, dtRaw) => {
      if (disposed) return
      signals.update()
      const dt = forensic.freeze ? 0 : dtRaw
      const t = forensic.frozenT ?? signals.scrollT
      mod.update(t, dt)
      if (mod.render) mod.render()
      else renderer.render(scene, camera)
    })
    ticker.start()

    return () => {
      disposed = true
      ticker.stop()
      window.removeEventListener('resize', onResize)
      signals.dispose()
      mod.dispose()
      renderer.dispose()
    }
  }, [seed])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', display: 'block' }}
    />
  )
}
