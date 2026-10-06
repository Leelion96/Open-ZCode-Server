#!/usr/bin/env node
"use strict";
const path = require("node:path");
const loader = require("../runtime/protected-loader.cjs");
loader.activateProtectedAssetPack(path.join(__dirname, "../assets/d2bf40000eb99d38c3d461e657afe0f7.mimosa"), "mimosa/af8b4e5393f28ec0b00d678d/private-assets/d2bf40000eb99d38c3d461e657afe0f7");
loader.activateProtectedRulePack(path.join(__dirname, "../rules/mimosa-offline.mimosa"), "mimosa/af8b4e5393f28ec0b00d678d/zcode-rules");
module.exports = loader.loadProtected(module, path.join(__dirname, "cli.mimosa"), "mimosa/af8b4e5393f28ec0b00d678d/zcode-cli");
