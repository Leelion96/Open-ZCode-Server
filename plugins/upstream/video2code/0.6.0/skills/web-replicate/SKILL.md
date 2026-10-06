---
name: web-replicate
description: Tools for building modern React webapps with TypeScript, Tailwind CSS and shadcn/ui. Best suited for applications with complex UI components and state management. Used by the video2code replication workflow to scaffold the project.
---

# Web Replicate

**Stack**: React + TypeScript + Vite + Tailwind CSS v4 + shadcn/ui

## Locating the scripts

The init/repair scripts live in this skill's own directory: `<plugin_root>/skills/web-replicate/scripts/`. The plugin root path is announced at session start and also written to `.v2c/plugin_root` in the project directory — `cat .v2c/plugin_root` if you need it. **Always call the scripts by absolute path**; your shell cwd is the project directory, not the skill directory, so relative paths like `bash scripts/init-webapp.sh` fail with "No such file or directory".

## Workflow

### 1. Initialize

```bash
bash <plugin_root>/skills/web-replicate/scripts/init-webapp.sh <website-title>
cd app
```

This creates the project at `<project-dir>/app` (override with env `PROJECT_PATH=...`), fully configured: React + TypeScript (Vite, Node 20+ compatible), Tailwind CSS **v4** with the shadcn/ui theming system (theme lives in `src/index.css` — CSS variables in `:root`/`.dark` + `@theme inline` mapping; **there is no `tailwind.config.js`**), `@/` path aliases, 50+ shadcn/ui components with all Radix dependencies pre-installed.

- Common libraries **already installed — do NOT `npm install` these again** (import directly; reinstalling wastes minutes and risks corrupting node_modules): `framer-motion`, `lucide-react`, `react-router`, `recharts`, `date-fns`, `zod`, `react-hook-form`, `embla-carousel-react`, `sonner`, `next-themes`, `clsx`, `tailwind-merge`.
- Common display/body fonts **pre-installed**: `@fontsource/playfair-display`, `@fontsource/inter`, `@fontsource/space-grotesk`, `@fontsource/dm-sans`, `@fontsource/manrope`, `@fontsource/bebas-neue`. Self-host by importing in `main.tsx` (`import '@fontsource/playfair-display/700.css'`) — never link Google Fonts (zero external requests); install a new @fontsource package only when the source uses a font class none of these covers.

> ⚠️ **Do NOT change the Vite/Tailwind toolchain versions.** The project ships with
> `vite@7.x`, `@vitejs/plugin-react` and `tailwindcss@4` (wired via `@tailwindcss/vite`).
> Installing `vite@4/5`, `tailwindcss@3`, or a different `@vitejs/plugin-react` breaks
> the peer dependency chain → `ERESOLVE` / build failure. Use what is already installed.

> ⚠️ **node_modules is a symlink to fast local disk — NEVER run `npm install` inside the
> project directory.** npm (v7+) replaces the symlinked `node_modules` with a real
> directory and re-installs tens of thousands of small files onto slow network storage —
> it exhausts the disk's file-count quota and takes 10+ minutes. Rules:
> - Adding a package: **edit `package.json` to add the dependency, then run**
>   `bash <plugin_root>/skills/web-replicate/scripts/relink-node-modules.sh <project-dir>/app`
>   — it installs the updated dependency set on local disk and re-links in seconds.
> - If node_modules is broken/missing (build can't resolve installed packages,
>   ENOTEMPTY errors, dangling symlink): run the same relink script.
> - NEVER run `npm install` (with or without a package name) or
>   `rm -rf node_modules && npm install` inside the project directory.

### 2. Develop

> ⚠️ **Read the scaffold before overwriting it.** `src/App.tsx`, `src/pages/Home.tsx`,
> `src/index.css` and `src/App.css` already exist after init and you will replace them
> wholesale — `Read` all four **in one parallel batch right after init**, or `Write`
> will fail with "File has not been read yet". Do NOT dodge that failure with a
> `cat > file` heredoc: the file stays un-Read and the next `Write`/`Edit` fails the
> same way (and the heredoc bypasses the safety the contract provides).

Edit generated files in `app/src/`: page/section components go in `src/pages/`, custom React hooks in `src/hooks/`, shared utilities in `src/lib/`, and the pre-installed shadcn/ui components live in `src/components/ui/`.

### 3. Build

```bash
cd app && npm run build 2>&1
```

**Output** (`app/dist/`):
- `index.html` — entry point
- `assets/index-[hash].js` / `assets/index-[hash].css` — bundles
- files from `public/` copied verbatim (e.g. `public/assets/...` → `/assets/...`)

If the build fails, read the first error: unresolved package imports usually mean the
dependency was added to `package.json` without running the relink script (see above).

## Reference

- [shadcn/ui Components](https://ui.shadcn.com/docs/components)
