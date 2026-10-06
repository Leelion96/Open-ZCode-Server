import '../App.css'
import Stage from '../three/Stage'
import Hud from '../three/hud/Hud'

// 组装: 固定全屏 <Stage/> (3D) + <Hud/> (2D 覆盖) + 滚动占位体 (驱动 scrollT)。
// 复刻时按视频调整滚动章节数 (占位体高度) 与 HUD 内容, 场景本身改 src/three/scene/Scene.ts。
export default function Home() {
  return (
    <main className="relative bg-black">
      <Stage />
      <Hud />
      {/* 滚动占位: 高度决定 scrollT 行程 (这里 4 屏)。真站按叙事章节数设。 */}
      <div style={{ height: '400vh' }} />
    </main>
  )
}
