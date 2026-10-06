# Obsidian for ZCode

[中文文档](./README_CN.md)

This ZCode plugin packages the six agent skills from [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) plus visualization skills from [axtonliu/axton-obsidian-visual-skills](https://github.com/axtonliu/axton-obsidian-visual-skills) — Mermaid and Excalidraw diagram generation, and text-to-canvas layout algorithms folded into `json-canvas` — together with a local `setup` skill, so they can be installed through the ZCode plugin marketplace. The skills teach the agent Obsidian's file formats and companion CLIs — no MCP servers or hooks are bundled.

## Prerequisites

Skills in this plugin rely on external CLIs and verify them at runtime:

- [Obsidian CLI](https://help.obsidian.md/cli) (`obsidian`) — required by the `obsidian-cli` skill, and a running Obsidian instance
- [Defuddle](https://github.com/kepano/defuddle) (`npm install -g defuddle`) — required by the `defuddle` skill
- [Knap](https://github.com/obsidianmd/knap) (`npm install -g knap`, Node.js 20+) — required by the `knap` skill

- [Excalidraw plugin](https://github.com/zsviczian/obsidian-excalidraw-plugin) (community plugin, install from inside Obsidian) — required by the `excalidraw-diagram` skill for its Obsidian `.md` output mode; the standard `.excalidraw` output opens on excalidraw.com without it

The other skills (`obsidian-markdown`, `obsidian-bases`, `json-canvas`, `mermaid-visualizer`) only read and write files in your vault and have no dependencies.

Run `/obsidian:setup` to verify these tools on a new machine and get guided installation (`/obsidian:setup obsidian` checks a single component).

Before installation or environment changes — during setup, or when the `defuddle` and `knap` skills find a tool missing — the plugin shows the proposed actions and asks for confirmation via Ask User (or in the conversation if the tool is unavailable). You can choose manual installation or skip; read-only checks do not require confirmation.

## Skills

| Skill | Description |
|-------|-------------|
| setup | Verify and install the plugin's CLI dependencies: official Obsidian CLI registration, defuddle, and knap |
| obsidian-markdown | Create and edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, and properties |
| obsidian-bases | Create and edit `.base` files with views, filters, formulas, and summaries |
| json-canvas | Create and edit `.canvas` whiteboard files with nodes, edges, and groups; generate MindMap or freeform canvases from text content |
| mermaid-visualizer | Turn text into professional Mermaid diagrams (flows, mindmaps, sequence, state) with built-in syntax-error prevention |
| excalidraw-diagram | Generate hand-drawn style Excalidraw diagrams in three modes: Obsidian `.md`, standard `.excalidraw`, and animated |
| obsidian-cli | Read, create, search, and manage notes in a running Obsidian vault; plugin/theme development support |
| defuddle | Extract clean markdown from web pages, stripping navigation and ads to save tokens |
| knap | Render markdown notes from templates and JSON/CSV data, including batch generation |

Skills are invoked automatically when relevant (e.g. editing a `.base` file or saving a web article into your vault). You can also trigger them explicitly, for example `/obsidian:obsidian-markdown` or `/obsidian:knap`.

## Examples

```text
# Turn a web article into a clean note in the vault
Read https://example.com/article and save it as a note in my vault

# Build a literature database over the vault
Create a .base file showing all notes tagged #book, grouped by status, with rating shown as a card view

# Batch-generate notes from structured data
Use knap to render one note per row of books.csv using my book template

# Visualize content as diagrams
Turn this article into an Excalidraw mind map
Create a Mermaid flowchart of the CI/CD pipeline and save it into my vault
```

## Attribution

The six core skills are authored by [Steph Ango](https://github.com/kepano); the `mermaid-visualizer` and `excalidraw-diagram` skills, plus the layout algorithms folded into `json-canvas`, are by [Axton Liu](https://github.com/axtonliu). Both sets are imported from their upstream repositories — see [UPSTREAM.md](./UPSTREAM.md) for the imported commits, licenses, and adaptation deltas. This adaptation adds the ZCode plugin manifests, marketplace registration, this documentation, and a local `setup` skill; all other skills are upstream-derived.
