from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


DOCTOR_PATH = (
    Path(__file__).resolve().parents[1]
    / "skills"
    / "env-setup"
    / "scripts"
    / "env_doctor.py"
)
SPEC = importlib.util.spec_from_file_location("video2code_env_doctor", DOCTOR_PATH)
assert SPEC is not None and SPEC.loader is not None
env_doctor = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = env_doctor
SPEC.loader.exec_module(env_doctor)


class McpDependencyProbeTest(unittest.TestCase):
    def test_rejects_mcp_2_x(self) -> None:
        with patch.object(env_doctor.importlib.util, "find_spec", return_value=object()), patch.object(
            env_doctor.importlib_metadata, "version", return_value="2.0.0"
        ):
            ok, detail = env_doctor.probe_mcp_sdk()

        self.assertFalse(ok)
        self.assertIn("mcp==1.9.0", detail)

    def test_accepts_exact_mcp_version(self) -> None:
        fake_spec = type("Spec", (), {"origin": "/tmp/mcp/__init__.py"})()
        with patch.object(env_doctor.importlib.util, "find_spec", return_value=fake_spec), patch.object(
            env_doctor.importlib_metadata, "version", return_value="1.9.0"
        ):
            ok, detail = env_doctor.probe_mcp_sdk()

        self.assertTrue(ok)
        self.assertIn("1.9.0", detail)


if __name__ == "__main__":
    unittest.main()
