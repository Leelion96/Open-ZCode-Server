#!/usr/bin/env python3
"""runtime MCP server：仅保留部署与素材工具。

浏览器导航、截图和录制统一使用 ZCode 内置 Browser Use SDK。插件不再启动
Playwright/Chromium，也不会维护第二份浏览器状态。
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from server_common import serve
from v2c_tools import asset, deploy
from v2c_tools.run_context import RunContext
from v2c_tools.schemas import TOOL_SCHEMAS


def main() -> None:
    ctx = RunContext()
    names = ["deploy_website", "get_asset"]
    impls = {
        "deploy_website": deploy.deploy_website,
        "get_asset": asset.get_asset,
    }
    schemas = {name: TOOL_SCHEMAS[name] for name in names}

    def has_catalog() -> bool:
        if os.environ.get("V2C_HAS_CATALOG", "").strip().lower() in ("1", "true", "yes"):
            return True
        candidate = os.environ.get("V2C_CATALOG_PATH")
        if candidate and Path(candidate).is_file():
            return True
        return (ctx.project_dir / "assets_catalog.json").is_file()

    if not has_catalog():
        names.remove("get_asset")
        impls.pop("get_asset")
        schemas.pop("get_asset")

    serve("v2c-runtime", schemas, impls, ctx, on_shutdown=lambda: deploy.stop_all(ctx))


if __name__ == "__main__":
    main()
