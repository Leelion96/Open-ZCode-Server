# Upstream

This plugin is adapted from an upstream GitHub CLI workflow project. The adaptation keeps the original attribution and license information in this directory.

- Source commit: `13a790768a0cf7d43491a395566d3d068928e53c`
- Imported on: 2026-08-11
- License: the upstream README says MIT, but the repository has no `LICENSE` file and GitHub reports no detected license; this remains an open publishing gate.

The ZCode adaptation adds the ZCode-first manifest, bilingual marketplace metadata,
ZCode marketplace registration, localized documentation, a `/github:setup` skill,
and a shared GitHub CLI installation/authentication preflight. It also replaces
unsafe shell interpolation examples with file-based body/notes inputs and adds
explicit confirmation around sensitive or remote-changing operations. The
remaining GitHub CLI workflow instructions are upstream-derived and should be
reviewed before enabling the plugin in a project.
