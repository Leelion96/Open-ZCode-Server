#!/usr/bin/env python3
"""PreToolUse(Write|Edit): 产物目录写组件代码前, out/plan.md 必须存在。

客观布尔条件: 目标路径落在 app/src/ 下 且 out/plan.md 不存在 → 拦。
其余写入 (plan.md 本身 / out/ 其他文件 / 项目脚手架 / 任意非 src 路径) 一律放行。
同规则连拦 3 次放行并记录 (hook_common.strike)。

**兼任契约认领点**: 写 out/plan.md 或 app/src/** 就是"本会话在做这个复刻任务"的客观
证据, 此时把契约归属记到本会话 (hook_common.claim_contract, last-writer-wins)。Stop
hook 只对认领者强制收尾 —— 没有这一笔, 工作区里任何遗留的未闭环契约都会被强塞给之后
在此打开的任意会话。认领与拦不拦无关: 放行的路径上也要认领。
"""
from __future__ import annotations
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from hook_common import (read_stdin_json, project_dir, strike, clear_strike,
                         claim_contract, deny, allow)  # noqa: E402

RULE = "plan_before_code"


def main() -> None:
    data = read_stdin_json()
    tool_input = data.get("tool_input") or {}
    fp = tool_input.get("file_path") or tool_input.get("path") or ""
    if not fp:
        allow()
    pd = project_dir()
    try:
        rel = Path(fp).resolve().relative_to(pd.resolve())
    except ValueError:
        allow()  # 项目外路径不归本规则管
    parts = rel.parts
    # 只拦网站组件源码 (app/src/**); 脚手架配置、public 资产等不拦
    is_src = len(parts) >= 2 and parts[0] == "app" and parts[1] == "src"
    is_plan = rel.as_posix() == "out/plan.md"
    if is_src or is_plan:
        # 动了契约产物 → 本会话认领该契约 (Stop hook 据此决定该不该强制收尾)
        claim_contract(str(data.get("session_id") or ""),
                       "out/plan.md" if is_plan else rel.as_posix())
    if not is_src:
        allow()
    plan = pd / "out" / "plan.md"
    if plan.is_file():
        clear_strike(RULE)
        allow()
    n, released = strike(RULE)
    if released:
        allow()  # 三振放行, violations.jsonl 已记录
    deny(
        "在写任何组件代码之前, 设计规格文件 out/plan.md 必须先存在 (当前没有)。\n"
        "先完成 Phase 3: 把设计规格 Write 到 out/plan.md — 每条可观察项一行, 以 "
        "[S<编号>] 或 [D<编号>] 开头, 带实测数字; [D] 行须引用源视频切片时间段。"
        "写完 plan.md 再回来写 src/ 组件。"
        f" (本规则第 {n}/3 次拦截)"
    )


if __name__ == "__main__":
    main()
