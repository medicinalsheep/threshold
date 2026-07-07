# Changelog

## 10.1.1 — Lobby + panel stability

- **Lobby restored** — VOIP open by default, SESSION flow, ENTER + CREATE, starter template visible (no samples yet)
- **Panels fixed** — Compiler/PromptGen always in nav; dock not hidden on load; collapse toggle works both ways
- **Removed auto-popup** — SETUP no longer forces open on session start
- **Deploy fix** — `package-lock.json` synced to package version (CI `npm ci` was failing)

## 10.1.0 — SETUP tab + design brief intake

- **Minimal session UI** — join with sparse chrome; **SETUP** always available (not unlock-on-object)
- **Design brief wizard** — world / character / prop / animation / texture / sound; export targets, poly budget, GIMP/Blender workflow, reference sounds (record/upload)
- **Agent follow-up forms** — agents can return `intake_questions` JSON; user answers in a GrokDevPrompt-style popup before code generates
- **SETUP panel** — Grok key, Ollama tiers, creative watch; advanced dev/training tools collapsed in `<details>`
- **Show all tools** checkbox — opt-in to Compiler, PromptGen, full scene dock

## 10.0.0 — Blank grid rebuild

Focused, smaller default experience. Capabilities (multiplayer, agents, compiler, export, plugins) remain — the **default path** is simpler.

### For users
- **Default world** — blank grid; no bundled showcase props or low-quality starter meshes
- **Host-first lobby** — CREATE SESSION is the primary entry; offline play under "Offline & options"
- **Progressive UI** — scene dock, Compiler, and PromptGen unlock as you build (not shown on day one)
- **Scene dock** — collapse now hides the entire panel; **SCENE** tab on the right edge restores it
- **Removed from default** — Wardenclyffe showcase, survival tour, guided walkthrough on first visit

### Still available
- Multiplayer (PeerJS host/join/spectate)
- Compiler, PromptGen, AI agents (when unlocked or via host session)
- Export pipeline, store scripts, GIMP/Blender plugins (see `docs/`)
- TC Circuit demo (lobby → Offline & options)

### Developers
- Starter scene modules no longer imported at engine boot (smaller initial bundle)
- New: `src/shared/starterGrid.js`, `src/shared/progressiveUi.js`
- Version bump: `10.0.0`

---

Older release notes (9.x) are archived in git history prior to this rebuild.