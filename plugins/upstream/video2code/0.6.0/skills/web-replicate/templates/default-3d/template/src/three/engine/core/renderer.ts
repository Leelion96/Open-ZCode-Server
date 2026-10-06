import * as THREE from 'three'

// engine/core — WebGLRenderer 工厂。软渲生存默认: pixelRatio 上限 1 (省像素),
// AA 由调用方按 ?lite 决定。sRGB 输出 + ACES 色调映射 (bloom/HDR 观感的常规起手)。禁改。
export function createRenderer(
  canvas: HTMLCanvasElement,
  opts: { antialias?: boolean } = {},
): THREE.WebGLRenderer {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: opts.antialias ?? true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  return renderer
}
