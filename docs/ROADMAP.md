# Threshold Roadmap (v10.8+)

**Current:** 10.8.0 · **Live:** https://medicinalsheep.github.io/threshold/

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

## 10.8 — Doc hygiene + brand preview (this release)

- Archive superseded phase docs → `old/docs/`
- Truth-pass active guides for blank grid + Agent Portal + corner hubs
- Favicon ladder + `og:*` meta from `icons/appicon512.png`
- New lean `ROADMAP.md` replaces `NEXT_PHASES.md` role

---

## 10.9 — Session security + touch polish

| Item | Deliverable |
|------|-------------|
| Host passcode | Optional passcode before JOIN; host sets at CREATE |
| Touch custom buttons | In-app action picker (replace `window.prompt`) |
| Lobby copy | Clearer room-code share UX |

---

## 10.10 — Agent stability + immersive peek

| Item | Deliverable |
|------|-------------|
| AI memory freeze | Harden GLTF park/restore edge cases |
| Native fullscreen | Optional Fullscreen API for stronger Alt-hold Third Eye peek |
| Parallel Ollama guard | Warn or block parallel local runs when freeze cannot park all assets |

---

## Open / deferred

| Area | Notes |
|------|-------|
| Mouse mode without Third Eye highlights | UI-only pointer mode for PLAY |
| `intent_classify` router | Prompt exists; no command router yet |
| Store upload automation | Signing keys remain local; upload manual |
| Training dataset growth | Starter JSONL only (~15 examples) |
| macOS notarization | Planned |
| AWS relay polish | Scaffold exists |
| Trellis/Veo-class models | Listed in `models-registry.json` |

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