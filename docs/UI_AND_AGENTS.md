# UI layout, agents & local model memory (v10.7+)

Quick reference for features shipped after the 10.0 blank-grid rebuild. Older docs may still say "SCENE → AI tab" — today everything lives under **SETUP** (scene dock) and **Agent Portal**.

**Live version:** see `src/config.js` → `VERSION`

---

## Agent Portal & SETUP

| Feature | Where | Notes |
|---------|-------|-------|
| Auto-detect Grok + Ollama | Agent Portal on enter | Connect → tier picks → build chat |
| Model tiers | small / medium / large | Chat · patches · full world scripts |
| Capability matrix | SETUP + Portal | Red ✗ · yellow ⚠ · green ● per model×tier |
| Sequential local runs | SETUP checkbox | Default: one Ollama model at a time |
| Model status HUD | Top float + SETUP | Active model, queue, freeze state |
| Working folder | SETUP + Portal | Memory scope during local Ollama |
| AI memory freeze | Automatic on local run | Screen snapshot, park assets, restore after |
| Multi-step builds | Portal build options | Layout → props → atmosphere |
| Ollama CORS | Local dev | `npm run ollama:serve` — not plain `ollama serve` |

See also [AGENT_ROUTING.md](AGENT_ROUTING.md) for tier config files.

---

## In-game UI (corner hubs)

| Corner | PLAY | EDIT |
|--------|------|------|
| Top-left | PLAY/EDIT toggle · AI · LINK · **UNLOCK** | Same + layout edit |
| Top-right | hidden | TOOLS menu |
| Bottom-left | TOUCH · WALK/FLY · FULL | Same |
| Bottom-right | PLAY+ menu | SCENE menu (ENV, EDIT, SKIN, SFX, **SETUP**) |

**UNLOCK** → drag corner buttons, FPS HUD, model status bar, chat header, nav brand, touch controls → **LOCK** when done.

**T** — in-game chat · **/** — commands · **help** menu

---

## Touch controls

- Toggle: bottom-left **TOUCH** or SETUP
- Standard layout: move stick, camera stick, ADS, fire, jump, sprint, crouch, reload, melee, holster, interact, third eye, vehicle, flashlight, FPS toggle, pause
- **UNLOCK** UI → drag any control; **+ BTN** adds custom button (pick action from Keys menu list)
- Positions persist in `ViewPrefs` (`touchLayoutV2`)

---

## Play / combat / Third Eye

| Input | PLAY walk + FPS |
|-------|-----------------|
| **LMB hold** | Aim (ADS) + pointer lock |
| **RMB** | Fire |
| **F** | Interact or toggle Third Eye |
| **Alt hold** | Third Eye peek — free mouse for UI clicks; release to aim again |
| Third Eye on (F) | Mouse free — click props/terminals; no ADS |

**Stealth walk** default: **U** hold (moved off Alt in 10.7.4 to avoid Alt peek conflict).

---

## Multiplayer room codes

Host codes: `NAME4-PLAYERKEY-RAND4` (e.g. `ALIC-K7M2NP-QR8W`). Share `?room=CODE` link.

- xAI API keys: `sessionStorage` per tab — **not** sent to guests over PeerJS
- Ollama: each player's browser talks to **its own** localhost — guests cannot use host's Ollama from GitHub Pages

Optional future: host passcode before JOIN accepted.

---

## Related

- [CONTROLS.md](CONTROLS.md) — full binding tables
- [CHANGELOG.md](CHANGELOG.md) — version history
- [AGENT_ROUTING.md](AGENT_ROUTING.md) — tier JSON config