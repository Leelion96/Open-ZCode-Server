// engine/core — 取证钩子: 用 URL 参数把动画钉在确定状态, 供验证脚本确定性截图。禁改。
//   ?t=<0..1>   把场景钉在该滚动进度 (冻结 scrollT), 用于逐 BEAT 静帧比对
//   ?freeze     停在当前帧 (dt=0), 冻结墙钟动画
//   ?lite       降载模式 (粒子减半 / 关后处理 / 关 AA), scene 自行读取 forensic.lite
//   ?autodemo   自动演示 (无交互也走完 BEAT), scene 自行读取 forensic.autodemo
export interface Forensic {
  frozenT: number | null
  freeze: boolean
  lite: boolean
  autodemo: boolean
}

export function createForensic(search: string = window.location.search): Forensic {
  const p = new URLSearchParams(search)
  const traw = p.get('t')
  let frozenT: number | null = null
  if (traw !== null && traw !== '') {
    const v = Number(traw)
    if (Number.isFinite(v)) frozenT = Math.min(1, Math.max(0, v))
  }
  return {
    frozenT,
    freeze: p.has('freeze'),
    lite: p.has('lite'),
    autodemo: p.has('autodemo'),
  }
}
