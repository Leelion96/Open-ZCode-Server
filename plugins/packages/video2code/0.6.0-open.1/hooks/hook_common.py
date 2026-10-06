"""hook 公共层: stdin JSON 读取 / 状态目录 / 三振放行计数器 / 契约归属。

原则 (迁移方案 §3):
- hook 只查客观布尔条件, 不查质量;
- 拒绝消息复述"缺什么、写到哪、什么格式" (被拦一次等于被重新教一遍);
- 同一规则连拦 3 次放行并记录违规 (计数器落 ${CLAUDE_PLUGIN_DATA}, 兜底
  <project>/.v2c/hook_state), 避免把会话楔死。

契约归属 (claim_contract / read_contract_owner): 复刻契约是**会话**的义务, 不是
**工作区**的义务。谁写 out/plan.md 或 app/src/** 谁认领 (last-writer-wins), 归属落
<project>/.v2c/contract_owner.json。没有这层归属时, 工作区里任何遗留的未闭环契约
都会被 Stop hook 强塞给之后在此打开的任意会话 (哪怕它做的是完全无关的任务)。

会话级放行预算 (session_budget): 与 strike() 的区别是**永不因一次全绿清零**。
strike() 的三振计数在审计全绿时 clear_strike 归零, 于是多会话互改源码导致的
"全绿 → 证据过期 → 再变红" 震荡会把三振阀门无限重置, 三振永远攒不满。
session_budget 按会话累计, 用尽即对该会话永久放行 —— 回合不会被无限征税。
"""
from __future__ import annotations
import json
import os
import re
import sys
import time
from pathlib import Path


def read_stdin_json() -> dict:
    try:
        return json.load(sys.stdin)
    except Exception:
        return {}


def project_dir() -> Path:
    p = os.environ.get("CLAUDE_PROJECT_DIR")
    return Path(p) if p else Path.cwd()


def state_dir() -> Path:
    d = os.environ.get("CLAUDE_PLUGIN_DATA")
    root = Path(d) if d else project_dir() / ".v2c" / "hook_state"
    root.mkdir(parents=True, exist_ok=True)
    return root


def strike(rule: str, limit: int = 3) -> tuple[int, bool]:
    """规则 rule 拦截计数 +1。返回 (当前次数, 是否已到放行线)。

    到线时在 violations.jsonl 记一笔 (可据此过滤/审查会话), 计数清零。"""
    d = state_dir()
    f = d / f"strike_{rule}.count"
    try:
        n = int(f.read_text().strip())
    except Exception:
        n = 0
    n += 1
    released = n >= limit
    if released:
        f.write_text("0")
        with (d / "violations.jsonl").open("a") as vf:
            vf.write(json.dumps({"rule": rule, "strikes": n}, ensure_ascii=False) + "\n")
    else:
        f.write_text(str(n))
    return n, released


def clear_strike(rule: str) -> None:
    f = state_dir() / f"strike_{rule}.count"
    if f.exists():
        f.write_text("0")


def session_budget(rule: str, session_id: str, limit: int = 3) -> tuple[int, bool]:
    """本会话对 rule 的累计拦截次数 +1, 返回 (次数, 是否已用尽)。

    与 strike() 的关键区别: **没有 clear 接口, 全绿也不归零**。多会话互改源码时
    审计会在"全绿 → 证据集体过期 → 再变红"之间震荡, 每次变红都把 strike 计数
    重置成 1, 三振永远攒不满 —— 本计数器专门堵这个洞: 同一会话被同一规则拦够
    limit 次后永久放行, 保证回合数有上限。session_id 缺失时退化为按 'nosid' 计。"""
    key = re.sub(r"[^A-Za-z0-9_-]", "", str(session_id))[:32] or "nosid"
    f = state_dir() / f"blocks_{rule}_{key}.count"
    try:
        n = int(f.read_text().strip())
    except Exception:
        n = 0
    n += 1
    try:
        f.write_text(str(n))
    except OSError:
        pass
    return n, n >= limit


# ---------- 契约归属 / 显式放弃 ----------

def _v2c_dir() -> Path:
    d = project_dir() / ".v2c"
    d.mkdir(parents=True, exist_ok=True)
    return d


def owner_file() -> Path:
    """契约归属记录 (项目级, 不走 CLAUDE_PLUGIN_DATA — 契约属于这个工作区)。"""
    return project_dir() / ".v2c" / "contract_owner.json"


def read_contract_owner() -> dict:
    try:
        obj = json.loads(owner_file().read_text(encoding="utf-8"))
        return obj if isinstance(obj, dict) else {}
    except Exception:
        return {}


def claim_contract(session_id: str, why: str) -> None:
    """本会话认领工作区的复刻契约 (last-writer-wins)。

    在"真的动了契约产物"时调用 (写 out/plan.md 或 app/src/**), 而不是一开会话就认领
    —— 认领的语义是"我在做这个任务", Stop hook 据此只对认领者强制收尾。
    session_id 缺失 (宿主未提供) 时不写, 由 Stop hook 走维持旧行为的分支。"""
    sid = str(session_id or "").strip()
    if not sid:
        return
    cur = read_contract_owner()
    prev = cur.get("session_id")
    try:
        _v2c_dir()      # 必须先建目录: .v2c/ 不存在时 write_text 会 OSError 被吞掉
        owner_file().write_text(json.dumps({
            "session_id": sid,
            "t": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "why": str(why)[:120],
            "claims": int(cur.get("claims") or 0) + 1,
            "prev": prev if prev and prev != sid else cur.get("prev"),
        }, ensure_ascii=False), encoding="utf-8")
    except OSError:
        pass


ABANDON_NAME = "contract_abandoned"


def contract_abandoned() -> str | None:
    """用户显式放弃该契约的出口: <project>/.v2c/contract_abandoned (内容=原因)。

    存在即返回原因字符串 (可能为空串), 不存在返回 None。只影响 Stop hook 是否强制
    收尾; contract_audit.py 的账面结论不受影响 (台账里仍看得到契约未闭环)。"""
    p = project_dir() / ".v2c" / ABANDON_NAME
    if not p.exists():
        return None
    try:
        return p.read_text(encoding="utf-8", errors="ignore").strip()[:200]
    except OSError:
        return ""


def deny(message: str) -> None:
    """PreToolUse: 拒绝本次工具调用, stderr 回给模型。"""
    print(message, file=sys.stderr)
    sys.exit(2)


def feedback(message: str) -> None:
    """PostToolUse: 不拦截 (工具已执行), 把提醒作为反馈回给模型。"""
    print(message, file=sys.stderr)
    sys.exit(2)


def block_stop(reason: str) -> None:
    """Stop: 阻止收尾, reason 回给模型继续工作。"""
    print(json.dumps({"decision": "block", "reason": reason}, ensure_ascii=False))
    sys.exit(0)


def allow() -> None:
    sys.exit(0)


def allow_with_note(message: str) -> None:
    """Stop: 放行, 但回一句话给宿主 (systemMessage 是 hook 通用字段; 宿主不支持时
    该字段被忽略, 行为退化成普通放行 — 放行语义不依赖它)。"""
    print(json.dumps({"continue": True, "systemMessage": message}, ensure_ascii=False))
    sys.exit(0)
