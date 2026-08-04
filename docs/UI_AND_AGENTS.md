# UI layout, agents & local model memory (v10.15)

Quick reference for corner hubs, interaction modes, Agent Portal, optional Grok key, and session lobby. Older docs may still say "SCENE → AI tab" — today everything lives under **SETUP** (scene dock) and **Agent Portal**.

**Live version:** see `src/config.js` → `VERSION` (10.20+) · **Spine:** [BUILD_FROM.md](BUILD_FROM.md)  
**Creator path:** ENTER → **BUILD SOMETHING** → brief → **GENERATE → LIVE SCENE** · SKIN shape/wardrobe · Export.

---

## UI surfaces (player / creator / full)

Same live URL — different chrome. Module: `src/shared/surfaceProfile.js`.

| Profile | Default when | Hides |
|---------|----------------|--------|
| **player** | Coarse pointer, mobile UA, width ≤900 | AI portal chip, Ollama probes, SETUP/Compiler/PromptGen/export, Grok lobby block |
| **creator** | Desktop fine pointer | Full-only extras |
| **full** | `?surface=full` | Nothing |

- **URL:** `?surface=player|creator|full` (preferred over `mode` for surface)
- **Lobby:** Play / Creator / Full chips · BUILD mode nudges creator
- **In-engine:** SCENE → “Creator tools…” on player · SETUP switcher
- Pref stored in `ViewPrefs.surfaceProfile`

---

## Lobby (session start)

| Action | Notes |
|--------|-------|
| **ENTER →** | Solo primary path — **terminal grid** · **PLAY** walk-ready (no PeerJS) |
| **CREATE SESSION** | Multiplayer host (12s Peer timeout if server hangs) |
| **JOIN / SPECTATE** | Room code + optional passcode |
| **More options** | Passcodes, starter world (**Blank Grid** / **Workspace Pad** / TC), voice, Grok |
| Display name | Custom name shown in multiplayer (no account required) |

Grok is optional. Voice mic is requested **after** the session starts (never blocks CREATE).

After CREATE: share panel → copy code/link → **ENTER SESSION →**.

---

## Optional Grok key

| | |
|--|--|
| **Grok / xAI** | Cloud AI — key from [console.x.ai](https://console.x.ai) (not SuperGrok tab) |
| **Where** | Lobby → More options → Grok, nav **Grok**, Agent Portal |
| **X OAuth** | **Removed** — no Sign in with X / feed / post |

See [AUTH.md](AUTH.md).

---

## Agent Portal & SETUP

| Feature | Where | Notes |
|---------|-------|-------|
| Auto-detect Grok + Ollama | Agent Portal (creator surface) | Connect → tier picks → build chat; **no Ollama on player** |
| Model tiers | small / medium / large | Chat · patches · full world scripts |
| Capability matrix | SETUP + Portal | Red ✗ · yellow ⚠ · green ● per model×tier |
| Sequential local runs | SETUP checkbox | Default: one Ollama model at a time |
| Model status HUD | Top float + SETUP | Active model, queue, freeze state |
| Working folder | SETUP + Portal | Memory scope during local Ollama |
| AI memory freeze | Automatic on local run | Screen snapshot, park assets, restore after |
| Multi-step builds | Portal build options | Layout → props → atmosphere |
| **Live apply in scene** | Portal build options (default ON) | Each step runs in Engine; walk while agents work · `LiveBuild` HUD · docked portal |
| **BUILD SOMETHING** | Floating CTA after ENTER · hub **AI** | Fast path: auto-connect → chat → GENERATE (10.17) |
| **Quick brief** | Portal chat | One clear scene message unlocks GENERATE (no multi-turn ready JSON) |
| **Wardrobe** | SCENE → SKIN | Slot rail + catalog cards · presets · live equip when spawned (10.19) |
| Generation policy | `generation-policy.json` | Intensity budgets + MOD required/optional slots |
| Ollama CORS | Local + Pages | `npm run ollama:serve` — not plain `ollama serve` |

See also [AGENT_ROUTING.md](AGENT_ROUTING.md) for tier config files.

---

## In-game UI (corner hubs)

| Corner | Role |
|--------|------|
| Top-left | Mode badge cycles **PLAY → ARRANGE → EDIT** · AI · LINK · **UNLOCK** |
| Top-right | TOOLS (edit-like modes) |
| Bottom-left | TOUCH · WALK/FLY · FULL |
| Bottom-right | PLAY+ (play as, skin…) · SCENE (ENV, EDIT, SKIN, SFX, **SETUP**) |

### Mode badges

| Badge | Color cue | Meaning |
|-------|-----------|---------|
| **PLAY** | Amber | Sim running · walk · push props |
| **ARRANGE** | Terminal green | Paused · click/drag/WASD props · snap |
| **EDIT** | Accent green | Paused · gizmo · inspector · insert |
| **PLAY AS** | Blue | Possessing NPC/prop (solo) · **K**/Esc release |

INSERT opens on **QUALITY** first (ladder). Character / GLTF / code remain as sibling tabs.

**UNLOCK** → drag corner buttons, FPS HUD, model status bar, chat header, nav brand, touch controls → **LOCK** when done.

**T** — in-game chat · **/** — commands · **help** menu · **K** — play as / release

---

## Touch controls

- Toggle: bottom-left **TOUCH** or SETUP
- Practical layout (v4): move stick, camera stick, ADS, fire, jump, sprint, crouch, reload, melee, holster, interact, third eye, vehicle, flashlight, FPS toggle, pause
- **UNLOCK** UI → drag any control; **+ BTN** adds custom button (pick action from Keys menu list)
- Positions persist in `ViewPrefs` (`touchLayoutV4`)

---

## Play / combat / Third Eye

| Input | PLAY walk + FPS |
|-------|-----------------|
| **LMB hold** | Aim (ADS) + pointer lock |
| **RMB** | Fire |
| **F** | Interact or toggle Third Eye |
| **M** / **Alt hold** | UI mouse (no highlights) — free mouse for hubs |
| Third Eye on (F) | Mouse free — click props/terminals; highlights on |

**Stealth walk** default: **U** hold.

**Voice PTT** default: **N** hold (rebind in KEYS).

---

## Multiplayer room codes

Host codes: `NAME4-PLAYERKEY-RAND4` (e.g. `ALIC-K7M2NP-QR8W`). Share `?room=CODE` link.

- Optional **host passcode** at CREATE (More options) or PLAYERS panel; guests enter on JOIN
- xAI API keys: `sessionStorage` per tab — **not** sent to guests over PeerJS
- Ollama: each player's browser talks to **its own** localhost — guests cannot use host's Ollama from GitHub Pages

---

## Related

- [CONTROLS.md](CONTROLS.md) — full binding tables
- [CHANGELOG.md](CHANGELOG.md) — version history
- [AGENT_ROUTING.md](AGENT_ROUTING.md) — tier JSON config
- [CAPABILITIES.md](CAPABILITIES.md) — shipped snapshot
