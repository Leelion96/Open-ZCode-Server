"""RunContext: Sandbox 的 CC 迁移替代。

旧 Sandbox 的两件事在 CC 下的去向:
1. 虚拟路径翻译 (上游沙箱虚拟路径 → 运行目录) — 退役。CC 会话直接工作在真实
   项目目录 (CLAUDE_PROJECT_DIR), resolve() 只做"相对路径锚定项目目录", 绝对
   路径透传, 保留 resolve/virtualize 调用点让工具实现零改动。
2. 有状态资源持有 (deploy 子进程登记 / 运行配置) — 保留,
   挂在 MCP server 进程里的单例 RunContext 上, 生命周期与 server 进程一致。

目录约定 (相对项目目录):
    app/            网站项目 (web-replicate init 的 PROJECT_PATH 默认值)
    out/            模型产物 (plan.md / verify.jsonl / report.md / 截图 / 录像)
    .v2c/           工具内部产物 (抽帧 clip / 素材预览 / serve 目录)
"""
from __future__ import annotations
import os
from pathlib import Path


def project_dir() -> Path:
    """CC 工程目录。.mcp.json 里 cwd 已设为 ${CLAUDE_PROJECT_DIR},
    env 兜底一层, 再兜到进程 cwd。"""
    p = os.environ.get("CLAUDE_PROJECT_DIR") or os.environ.get("V2C_PROJECT_DIR")
    return Path(p).resolve() if p else Path.cwd().resolve()


class RunContext:
    """每个 MCP server 进程一个实例 (工具实现签名里的 sandbox 参数改传它)。"""

    def __init__(self):
        self.project_dir = project_dir()
        # 模型可见产物区; 工具默认输出路径都指到这里
        self.output_dir = self.project_dir / "out"
        # 工具内部产物区 (模型一般不用看, 但路径是真实的, 看也能看)
        self.work_dir = self.project_dir / ".v2c"
        # 网站项目目录 (get_asset 落 public/assets 用)
        self.app_dir = self.project_dir / "app"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.work_dir.mkdir(parents=True, exist_ok=True)

        # 运行配置 (batch/插件 userConfig 经 env 下发, 模型不可 per-call 覆盖)
        self.media_resolution: str = os.environ.get("V2C_MEDIA_RESOLUTION") or "medium"

        # 素材 catalog: ref(a01..) → {url, thumb_url, w, h}。惰性加载
        # (batch 把 catalog.json 放进项目目录 / env 指定; 没有 = 形态 A 无素材清单)。
        self.catalog: dict[str, dict] = {}
        self._catalog_loaded = False

    # --- 路径 (兼容旧 Sandbox 调用点) ---

    @property
    def upload_dir(self) -> Path:
        """旧代码把 clip 中间产物放 upload_dir 下; CC 下映射到 .v2c/。"""
        return self.work_dir

    @property
    def root(self) -> Path:
        """旧代码 serve 目录挂 sandbox.root 下; CC 下映射到 .v2c/。"""
        return self.work_dir

    def resolve(self, path: str) -> Path:
        """恒等语义: 绝对路径透传; 相对路径锚定项目目录。"""
        p = Path(path)
        if p.is_absolute():
            return p
        return (self.project_dir / p).resolve()

    def virtualize(self, real_path: str | Path) -> str:
        """CC 下模型直接用真实路径; 项目内路径转相对 (短、可读), 项目外原样。"""
        rp = Path(real_path).resolve()
        try:
            return str(rp.relative_to(self.project_dir))
        except ValueError:
            return str(rp)

    # --- 素材 catalog ---

    def load_catalog(self) -> None:
        """惰性加载: env V2C_CATALOG_PATH 或项目目录下 assets_catalog.json。
        缺失/坏 JSON = 无 catalog (形态 A), 不报错。"""
        if self._catalog_loaded:
            return
        self._catalog_loaded = True
        import json
        cand = os.environ.get("V2C_CATALOG_PATH")
        p = Path(cand) if cand else self.project_dir / "assets_catalog.json"
        if not p.is_file():
            return
        try:
            data = json.loads(p.read_text())
        except Exception:
            return
        imgs = data.get("images", []) if isinstance(data, dict) else []
        self.catalog = {e["ref"]: e for e in imgs if e.get("ref")}
