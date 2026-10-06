#!/usr/bin/env node
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
process.env.MIMOSA_HOOK_MODULE_URL = import.meta.url;
const require = createRequire(import.meta.url);
const loader = require("../runtime/protected-loader.cjs");
loader.activateProtectedAssetPack(join(here, "../assets/d2bf40000eb99d38c3d461e657afe0f7.mimosa"), "mimosa/af8b4e5393f28ec0b00d678d/private-assets/d2bf40000eb99d38c3d461e657afe0f7");
loader.activateProtectedRulePack(join(here, "../rules/mimosa-offline.mimosa"), "mimosa/af8b4e5393f28ec0b00d678d/zcode-rules");
loader.loadProtectedScript(join(here, "git-gate-hook.mjs.mimosa"), "mimosa/af8b4e5393f28ec0b00d678d/zcode-hook/git-gate-hook.mjs", join(here, "git-gate-hook.engine.cjs"));
