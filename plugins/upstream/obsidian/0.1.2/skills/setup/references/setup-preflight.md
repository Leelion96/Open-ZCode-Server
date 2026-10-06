# Obsidian tooling preflight

Complete this preflight before running any skill step that shells out to
`obsidian`, `defuddle`, or `knap`, and whenever `/obsidian:setup` is invoked.
With no component selected, verify all three.

## Installation confirmation

Run read-only availability and version checks first. Before installing or
upgrading software, registering the CLI, or changing the environment, show
which components need work, the exact commands or app steps, and their
scope (global npm install, administrator access, symlink, or PATH change).
Use the available Ask User tool to ask whether to proceed, let the user
install manually, or skip. If no Ask User tool is available, ask in the
conversation and wait for an explicit answer.

Invoking setup or finding a missing dependency is not consent. An explicit
approval already given for the same disclosed actions can be reused; ask
again if the scope changes. No answer or a refusal means do not execute
those actions: continue independent checks and report skipped components
as not ready. After manual installation, wait for the user to finish and
re-run verification. `npx` may download packages, so it must not be used to
bypass this confirmation. Apply the same gate to Node.js installation and
the manual registration repairs below.

## 1. Verify the official Obsidian CLI

Run both checks instead of assuming the executable is available:

```bash
command -v obsidian
obsidian version
```

The agent shell's PATH can be more restricted than the user's terminal. If
`command -v obsidian` fails but the user says it works in their terminal, do
not conclude it is missing — probe the login-shell PATH and the known
registration locations before guiding an install:

```bash
zsh -l -i -c 'command -v obsidian; command -v obsidian-cli'
ls -l /usr/local/bin/obsidian
ls -l ~/.local/bin/obsidian-cli
ls -l /Applications/Obsidian.app/Contents/MacOS/obsidian-cli
```

Any hit below is a working CLI — use its absolute path in later commands:

- `/usr/local/bin/obsidian` — the current official macOS registration
  (symlink into the app bundle)
- `~/.local/bin/obsidian-cli` — the Linux registration path, sometimes
  present on macOS from earlier registrations
- `/Applications/Obsidian.app/Contents/MacOS/obsidian-cli` — the binary
  shipped inside the app

macOS note: the bundle also contains the GUI binary `Obsidian`. On
case-insensitive filesystems `which obsidian` may resolve to it. Recent
versions answer CLI arguments the same way, but confirm with
`obsidian version` before declaring the CLI ready, and prefer the explicit
registrations above.

The CLI controls the running Obsidian app. If Obsidian is not running, the
first command launches it — warn the user so the app window is expected.

If either check fails, guide the user through the official registration flow.
The CLI is not distributed via npm:

1. Install the latest Obsidian desktop app — the 1.12.7+ installer is
   required: https://obsidian.md/download
2. In Obsidian, open **Settings → General**, enable **Command line
   interface**, and follow the prompt to register the CLI.
3. Restart the terminal so PATH changes take effect, then run both checks
   again.

Official documentation: https://obsidian.md/help/cli

If registration does not stick, platform notes from the official docs:

- **macOS** — registration creates `/usr/local/bin/obsidian` as a symlink to
  the binary inside the app and asks for administrator privileges once.
  Check with `ls -l /usr/local/bin/obsidian`. Manual fix:

  ```bash
  sudo ln -sf /Applications/Obsidian.app/Contents/MacOS/obsidian-cli /usr/local/bin/obsidian
  ```

  Leftover `# Added by Obsidian` lines in `~/.zprofile` from an older
  registration can be deleted safely.
- **Windows** — registration adds Obsidian to the user PATH and uses the
  `Obsidian.com` terminal redirector installed next to `Obsidian.exe`.
  Restart the terminal after registering.
- **Linux** — registration copies the binary to `~/.local/bin/obsidian`.
  Make sure `~/.local/bin` is on PATH:

  ```bash
  export PATH="$PATH:$HOME/.local/bin"
  ```

  If the binary is missing, copy it manually from the Obsidian installation
  directory, then `chmod 755` it.

If Obsidian was just updated from an earlier version and the CLI still fails,
toggling the CLI setting off and on again re-runs PATH registration.

The installation confirmation above also covers `sudo`, shell profile edits,
and copying or moving binaries.

## 2. Verify defuddle

Run:

```bash
command -v defuddle
defuddle --version
```

If either check fails, guide the user to install it globally (requires
Node.js):

```bash
npm install -g defuddle
```

One-off use without a global install: `npx defuddle <url>`.
Project: https://github.com/kepano/defuddle

## 3. Verify knap

Run:

```bash
command -v knap
knap --version
```

If either check fails, guide the user to install it globally. knap requires
Node.js 20 or later:

```bash
npm install -g knap
```

One-off use without a global install: `npx knap`.
Project: https://github.com/obsidianmd/knap

If Node.js is missing or older than 20, direct the user to
https://nodejs.org or their usual package manager before installing knap.

## 4. Report readiness

After the selected checks pass, report each verified version, and for the
Obsidian CLI list the vaults it can see:

```bash
obsidian vaults
```

Never claim a component is ready until its check passes in this session. Do
not treat the user's report that they installed something as proof of
success — re-run the checks.
