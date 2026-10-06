"""check_closeout.py (Stop hook) 的归属/放弃/会话预算行为。

覆盖复刻契约反馈里的三个洞:
1. 工作区级强制继承 — 遗留契约被塞给之后在此打开的任意会话;
2. "全绿 → 证据过期 → 再变红"震荡把 strike 三振阀门无限重置, 回合永远收不掉;
3. 没有用户出口 — 唯一出路是把别人的契约做完。

hook 用 subprocess 跑真实入口 (stdin JSON → exit code + stdout), 不 mock,
因为要验的正是"宿主给什么 stdin 就走哪条分支"。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HOOK = Path(__file__).resolve().parents[1] / "hooks" / "check_closeout.py"

SID_A = "sess-aaaaaaaa-1111"      # 放弃了任务的会话
SID_B = "sess-bbbbbbbb-2222"      # 之后在同一工作区打开、做无关任务的会话


def _run(project: Path, session_id: str = "", stop_hook_active: bool = False,
         env_extra: dict | None = None) -> tuple[int, dict | None]:
    """跑一次 Stop hook, 返回 (exit_code, stdout 里的 JSON 或 None)。"""
    env = dict(os.environ)
    env["CLAUDE_PROJECT_DIR"] = str(project)
    env["CLAUDE_PLUGIN_DATA"] = str(project / ".v2c" / "hook_state")
    env.pop("V2C_NO_CLOSEOUT_HOOK", None)
    env.update(env_extra or {})
    payload = {"session_id": session_id, "stop_hook_active": stop_hook_active}
    p = subprocess.run([sys.executable, str(HOOK)], input=json.dumps(payload),
                       capture_output=True, text=True, env=env, cwd=str(project))
    out = None
    if p.stdout.strip():
        try:
            out = json.loads(p.stdout)
        except json.JSONDecodeError:
            out = None
    return p.returncode, out


def _blocked(res: tuple[int, dict | None]) -> bool:
    _, out = res
    return bool(out and out.get("decision") == "block")


class ClosecoutHookScopeTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.pd = Path(self.tmp.name)
        (self.pd / "out").mkdir(parents=True)
        (self.pd / "app" / "src").mkdir(parents=True)
        (self.pd / ".v2c" / "hook_state").mkdir(parents=True)
        # 一个未闭环契约: 3 个 plan id, verify.jsonl 空 → C1 三条缺口
        (self.pd / "out" / "plan.md").write_text(
            "- [S1] hero 标题 48px {core}\n"
            "- [S2] 卡片圆角 12px {detail}\n"
            "- [D1] 入场淡入 400ms {core}\n", encoding="utf-8")
        (self.pd / "out" / "verify.jsonl").write_text("", encoding="utf-8")

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _claim(self, sid: str) -> None:
        (self.pd / ".v2c" / "contract_owner.json").write_text(
            json.dumps({"session_id": sid, "t": "2026-08-17T15:00:00",
                        "why": "app/src/App.tsx", "claims": 1}), encoding="utf-8")

    def _close_green(self) -> None:
        """把契约做成闭环 (审计全绿), 用来制造"绿→红"震荡。"""
        cmp_dir = self.pd / "out" / "cmp"
        cmp_dir.mkdir(exist_ok=True)
        for rid in ("S1", "S2", "D1"):
            (cmp_dir / f"{rid}_beats.png").write_bytes(b"x")
        (self.pd / "out" / "verify.jsonl").write_text("\n".join(
            json.dumps({"id": rid, "result": "pass",
                        "evidence": f"out/cmp/{rid}_beats.png"})
            for rid in ("S1", "S2", "D1")), encoding="utf-8")
        (self.pd / "out" / "report.md").write_text("shipped: http://x\n", encoding="utf-8")

    def _dirty_src(self) -> None:
        """别的会话改了源码 → 证据集体过期 → 审计再变红 (C5/C6)。"""
        import time
        time.sleep(0.01)
        (self.pd / "app" / "src" / "App.tsx").write_text("// edited by another session\n",
                                                         encoding="utf-8")
        os.utime(self.pd / "app" / "src" / "App.tsx", None)

    # ---------- 洞 1: 工作区级强制继承 ----------

    def test_unowned_legacy_contract_does_not_block_unrelated_session(self) -> None:
        """会话 A 放弃、没人认领的契约, 不该拦住来做别的事的会话 B。"""
        res = _run(self.pd, session_id=SID_B)
        self.assertFalse(_blocked(res), "无归属的遗留契约仍然拦了无关会话")
        _, out = res
        self.assertIn("systemMessage", out or {}, "放行时应给出提示而不是静默")

    def test_contract_owned_by_other_session_does_not_block(self) -> None:
        """契约归属会话 A 时, 会话 B 只收到提示, 不被强制收尾。"""
        self._claim(SID_A)
        res = _run(self.pd, session_id=SID_B)
        self.assertFalse(_blocked(res))
        self.assertIn(SID_A[:8], (res[1] or {}).get("systemMessage", ""))

    def test_owner_session_is_still_blocked(self) -> None:
        """认领者本人有缺口时照旧拦 — 修复不能把契约本身废掉。"""
        self._claim(SID_B)
        res = _run(self.pd, session_id=SID_B)
        self.assertTrue(_blocked(res), "认领者有缺口却没拦, 契约失效了")
        self.assertIn("C1", (res[1] or {}).get("reason", ""))

    def test_no_plan_md_is_not_applicable(self) -> None:
        (self.pd / "out" / "plan.md").unlink()
        self.assertFalse(_blocked(_run(self.pd, session_id=SID_B)))

    # ---------- 洞 2: 震荡把三振阀门无限重置 ----------

    def test_green_red_oscillation_is_bounded_by_session_budget(self) -> None:
        """全绿会 clear_strike 归零, 所以只靠 strike 会无限拦; 会话预算必须收口。

        模拟 3 轮 "本会话拦一次 → 契约被做绿 → 别的会话改源码又变红"。
        """
        self._claim(SID_B)
        blocks = 0
        for _ in range(4):
            if _blocked(_run(self.pd, session_id=SID_B)):
                blocks += 1
            self._close_green()
            self.assertFalse(_blocked(_run(self.pd, session_id=SID_B)), "全绿时不该拦")
            self._dirty_src()   # 另一会话改源码 → 再变红
        self.assertLessEqual(blocks, 3, f"震荡里被拦了 {blocks} 次, 会话预算没生效")
        # 预算用尽后必须彻底不拦了
        self.assertFalse(_blocked(_run(self.pd, session_id=SID_B)),
                         "会话预算用尽后仍在拦 — 回合数没有上限")

    def test_stop_hook_active_releases_within_a_turn(self) -> None:
        """同一回合内被顶回过一次就放行 (原有阀门, 不能回退)。"""
        self._claim(SID_B)
        self.assertTrue(_blocked(_run(self.pd, session_id=SID_B)))
        self.assertFalse(_blocked(_run(self.pd, session_id=SID_B, stop_hook_active=True)))

    # ---------- 洞 3: 用户出口 ----------

    def test_abandon_file_releases_owner_session(self) -> None:
        self._claim(SID_B)
        self.assertTrue(_blocked(_run(self.pd, session_id=SID_B)))
        (self.pd / ".v2c" / "contract_abandoned").write_text(
            "用户只要创建技能, 不做百度首页复刻\n", encoding="utf-8")
        res = _run(self.pd, session_id=SID_B)
        self.assertFalse(_blocked(res), "已声明放弃仍被拦")
        self.assertIn("放弃", (res[1] or {}).get("systemMessage", ""))

    def test_env_kill_switch(self) -> None:
        self._claim(SID_B)
        res = _run(self.pd, session_id=SID_B,
                   env_extra={"V2C_NO_CLOSEOUT_HOOK": "1"})
        self.assertFalse(_blocked(res))
        # 关掉开关 (显式 0) 时仍应生效
        self.assertTrue(_blocked(_run(self.pd, session_id=SID_B,
                                      env_extra={"V2C_NO_CLOSEOUT_HOOK": "0"})))

    # ---------- 兼容: 宿主不提供 session_id ----------

    def test_missing_session_id_keeps_enforcing_when_owner_recorded(self) -> None:
        """拿不到 session_id 时不做归属判断, 维持旧行为 (照拦), 不静默失效。"""
        self._claim(SID_A)
        self.assertTrue(_blocked(_run(self.pd, session_id="")))


class ClaimContractTest(unittest.TestCase):
    """认领点: 写 out/plan.md 或 app/src/** 时归属落到本会话。"""

    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.pd = Path(self.tmp.name)
        (self.pd / "out").mkdir(parents=True)
        (self.pd / "app" / "src").mkdir(parents=True)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _write_hook(self, rel: str, sid: str) -> int:
        hook = HOOK.parent / "check_plan_first.py"
        env = dict(os.environ)
        env["CLAUDE_PROJECT_DIR"] = str(self.pd)
        env["CLAUDE_PLUGIN_DATA"] = str(self.pd / ".v2c" / "hook_state")
        payload = {"session_id": sid,
                   "tool_input": {"file_path": str(self.pd / rel)}}
        p = subprocess.run([sys.executable, str(hook)], input=json.dumps(payload),
                           capture_output=True, text=True, env=env, cwd=str(self.pd))
        return p.returncode

    def _owner(self) -> dict:
        f = self.pd / ".v2c" / "contract_owner.json"
        return json.loads(f.read_text(encoding="utf-8")) if f.is_file() else {}

    def test_writing_plan_claims_contract(self) -> None:
        self._write_hook("out/plan.md", SID_A)
        self.assertEqual(self._owner().get("session_id"), SID_A)

    def test_writing_src_claims_and_takes_over(self) -> None:
        (self.pd / "out" / "plan.md").write_text("- [S1] x\n", encoding="utf-8")
        self._write_hook("out/plan.md", SID_A)
        self._write_hook("app/src/App.tsx", SID_B)   # B 接手
        self.assertEqual(self._owner().get("session_id"), SID_B)
        self.assertEqual(self._owner().get("prev"), SID_A)

    def test_unrelated_write_does_not_claim(self) -> None:
        """写技能文件/README 之类不构成认领 — 否则又变成"谁都可能被继承"。"""
        self._write_hook("README.md", SID_B)
        self.assertEqual(self._owner(), {})


if __name__ == "__main__":
    unittest.main()
