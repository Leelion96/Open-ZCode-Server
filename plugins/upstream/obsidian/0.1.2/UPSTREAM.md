# Upstream

This plugin aggregates skills from two upstream repositories, both MIT-licensed, plus local additions written for this adaptation.

## Source 1: kepano/obsidian-skills

The official Agent Skills collection for Obsidian, maintained by Steph Ango.

- Source repository: https://github.com/kepano/obsidian-skills
- Source commit: `8ccef29ae8624eccc734e77ced4a6e54af5d83a` ("Add Knap skill")
- Imported on: 2026-09-12
- License: MIT, Copyright (c) 2026 Steph Ango (@kepano) — full notice in [LICENSE](./LICENSE) (section 1)

Imported skills: `obsidian-markdown`, `obsidian-bases`, `json-canvas`, `obsidian-cli`, `defuddle`, `knap` (each with its `references/` files).

Local delta: the `defuddle` and `knap` SKILL.md install hints were rewritten to require explicit user confirmation (Ask User, or an explicit reply) before `npm install -g` or `npx`, matching the setup skill's installation confirmation gate. Re-apply after re-syncing.

When re-syncing with this upstream, copy its `skills/` directory over `skills/` again (leaving `skills/setup/`, `skills/mermaid-visualizer/`, and `skills/excalidraw-diagram/` in place), then re-apply the Source 2 deltas to `skills/json-canvas/`, re-apply the confirmation-gate delta to `skills/defuddle/SKILL.md` and `skills/knap/SKILL.md`, and update the commit above.

## Source 2: axtonliu/axton-obsidian-visual-skills

Visual skills pack for Obsidian, by Axton Liu.

- Source repository: https://github.com/axtonliu/axton-obsidian-visual-skills
- Source commit: `1265976d9746a84858b4b7b42fb86a215aa93de9` ("enhance: improve SKILL.md design rules - color palette, font minimums, strokeStyle (v1.2.1)")
- Imported on: 2026-09-12
- License: MIT, Copyright (c) 2025 Axton Liu — full notice included in [LICENSE](./LICENSE) (section 2); upstream copy: [upstream LICENSE](https://github.com/axtonliu/axton-obsidian-visual-skills/blob/main/LICENSE)

Imported content and adaptation deltas:

- `skills/mermaid-visualizer/` — imported unchanged (SKILL.md + `references/syntax-rules.md`).
- `skills/excalidraw-diagram/` — imported with one adaptation: the save location now prefers the user's vault when the vault path is known, then asking the user, and only then the current working directory. Upstream unconditionally saves to the current working directory.
- `skills/json-canvas/` (a Source 1 skill, enhanced here) — from upstream `obsidian-canvas-creator`:
  - `references/layout-algorithms.md` imported unchanged (MindMap radial + freeform layout algorithms)
  - `assets/template-mindmap-simple.canvas` and `assets/template-freeform-grouped.canvas` imported unchanged
  - the node-sizing table and the generation workflow were distilled into a new "Generate a Canvas from Text Content" section in `skills/json-canvas/SKILL.md`, and the frontmatter description gained text-to-canvas triggers
  - upstream `references/canvas-spec.md` was NOT imported — it duplicates the JSON Canvas spec already covered by the json-canvas skill

## Local additions (no upstream counterpart)

The ZCode adaptation adds the ZCode plugin manifests (`.zcode-plugin/`, `.claude-plugin/`), bilingual plugin documentation (`README.md`, `README_CN.md`), marketplace registration in `marketplace.json`, and a `setup` skill (`skills/setup/`) that verifies and installs the Obsidian CLI, defuddle, and knap.
