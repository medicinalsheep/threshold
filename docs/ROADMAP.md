# Threshold Roadmap (v10.8+)

**Current:** 10.11.1 · **Live:** https://medicinalsheep.github.io/threshold/

Forward-looking plan after the 10.0 blank-grid rebuild and 10.7 agent/UI polish. Historical phase checklists (v3–9) live in [`old/docs/`](../old/docs/).

**Snapshot:** [CAPABILITIES.md](CAPABILITIES.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md) · **Vision:** [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)

---

## Shipped (10.0 → 10.7)

| Version | Focus |
|---------|-------|
| **10.0** | Blank grid default; progressive UI unlock; host-first lobby |
| **10.1** | SETUP tab; design brief intake; agent follow-up forms |
| **10.3–10.4** | Agent Portal; Grok/Ollama auto-detect; build quality sanitizer |
| **10.5** | Corner hub UI; in-game chat (`T`); hub LOCK layout |
| **10.6** | Model capability matrix; sequential Ollama queue |
| **10.7** | Working folder + AI memory freeze; room codes; touch + UNLOCK layout; Alt peek + ADS |

UI reference: [UI_AND_AGENTS.md](UI_AND_AGENTS.md) · Controls: [CONTROLS.md](CONTROLS.md)

---

## 10.8 — Doc hygiene + brand preview ✅

- Archive superseded phase docs → `old/docs/`
- Truth-pass active guides for blank grid + Agent Portal + corner hubs
- Favicon ladder + `og:*` meta from `icons/appicon512.png`
- New lean `ROADMAP.md` replaces `NEXT_PHASES.md` role

## 10.8.1 — Delete fix ✅

- Recursive pick + root resolve for GLTF/groups; proper dispose on delete

## 10.8.2 — Solo BUILD default + PLAY hint ✅

- **ENTER →** forces BUILD; PLAY mode shows edit hint banner
- `createObject` / GLTF insert guarded in PLAY (parity with delete)

---

## 10.9.0 — Lighter first-run + passcode ✅

- Explore-first: no auto-open Agent Portal; pulse AI + status
- Deferred graphics tier prompt (first PLAY or ENV)
- Action hint copy aligned to corner hubs
- Optional host passcode at CREATE; changeable in PLAYERS panel

## 10.9.1 — Touch picker + lobby invite ✅

- In-app touch action picker (replaces `window.prompt` on **+ BTN**)
- Post-CREATE invite panel — room code, link, copy buttons before enter
- Join hints for invite links and room code format

---

## 10.11.0 — Quality-first purge ✅

- **Showcase removed** — INSERT SHOWCASE tab, survival/ambient inspector fields, survival HUD/run card
- **Texture quality floor** — minimum 1K HILOD tier; Lite tier bumped to 1K; grid pad wires `Starter Ground` PBR
- **AI quality gate** — Agent Portal + SETUP brief ask poly budget, texRes, GIMP/Blender workflow before codegen
- **Archive** — `REALISTIC_GAMEPLAY.md`, `AMBIENT_ASSETS_ROADMAP.md`, showcase modules → `old/`

## 10.11.1 — Manifest + starter prune ✅

- **Manifest** — 100 → 25 texture entries; `_512` variants removed; grid + TC + avatar slots only
- **Starter modules** — 14 unused Wardenclyffe builders → `old/src/shared/`
- **`npm run manifest:prune`** — repeatable cleanup script

---

## 10.10 — Agent stability + immersive peek

| Item | Deliverable |
|------|-------------|
| AI memory freeze | Harden GLTF park/restore edge cases |
| Native fullscreen | Optional Fullscreen API for stronger Alt-hold Third Eye peek |
| Parallel Ollama guard | Warn or block parallel local runs when freeze cannot park all assets |

---

## Open / deferred (unpolished)

| Area | Notes |
|------|-------|
| **10.10** agent stability | AI memory freeze GLTF edge cases; native fullscreen peek; parallel Ollama guard |
| Regenerate default textures at 2K | Grid pad + AI Build Station hero PBR pass in GIMP |
| Doc version sync | `README.md`, `CAPABILITIES.md`, `GETTING_STARTED.md` still drift from live version |
| `controls:verify` / `store:verify` | Not re-run since 10.8.x |
| Mouse mode without Third Eye highlights | UI-only pointer mode for PLAY |
| `intent_classify` router | Prompt exists; no command router yet |
| Store upload automation | Signing keys remain local; upload manual |
| Training dataset growth | Starter JSONL only (~15 examples) |
| macOS notarization | Planned |
| AWS relay polish | Scaffold exists |
| Trellis/Veo-class models | Listed in `models-registry.json` |
| TC reference edition | Lobby **TC →** path kept; separate from default grid |

---

## Verify before ship

```bash
npm run build
node scripts/portal-ui-verify.cjs
npm run controls:verify
npm run store:verify    # optional packaging smoke
```

---

## Archive

| Doc | Location |
|-----|----------|
| `NEXT_PHASES.md` (v3–9 history) | `old/docs/` |
| `POLISH_ROADMAP.md` (sprints K–U) | `old/docs/` |
| `PHASE_13_STABILITY.md` | `old/docs/` |
| `PHASE_18_TESLA_LAB.md` | `old/docs/` |
| `DEFAULT_ASSETS_ROADMAP.md` | `old/docs/` |
| `REALISTIC_GAMEPLAY.md` | `old/docs/` |
| `AMBIENT_ASSETS_ROADMAP.md` | `old/docs/` |
| `showcaseSnippets.js`, `showcaseGateway.js` | `old/src/shared/` |
| Wardenclyffe `starter*.js` builders (14 files) | `old/src/shared/` |