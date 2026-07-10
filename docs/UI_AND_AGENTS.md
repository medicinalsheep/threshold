# UI layout, agents & local model memory (v10.12)

Quick reference for corner hubs, Agent Portal, dual accounts, and session lobby. Older docs may still say "SCENE → AI tab" — today everything lives under **SETUP** (scene dock) and **Agent Portal**.

**Live version:** see `src/config.js` → `VERSION`

---

## Lobby (session start)

| Action | Notes |
|--------|-------|
| **ENTER →** | Solo primary path — blank grid, no PeerJS (starts BUILD) |
| **CREATE SESSION** | Multiplayer host (12s Peer timeout if server hangs) |
| **JOIN / SPECTATE** | Room code + optional passcode |
| **More options** | Passcodes, starter world, voice, X & Grok accounts |
| Display name | Custom or X @handle / X name when signed in |

Neither X nor Grok is required to play. Voice mic is requested **after** the session starts (never blocks CREATE).

After CREATE: share panel → copy code/link → **ENTER SESSION →**.

---

## Dual accounts (optional)

| Account | Purpose | How |
|---------|---------|-----|
| **X** | Identity, feed, posts | OAuth 2.0 PKCE · `VITE_X_CLIENT_ID` · developer.x.com SPA |
| **Grok / xAI** | Cloud AI generation | API key from [console.x.ai](https://console.x.ai) — **not** SuperGrok browser tab |

- Lobby **More options → Accounts**, nav chips, or Agent Portal
- X scopes: `tweet.read` `tweet.write` `users.read` `offline.access` (re-sign-in after scope upgrades)
- Grok key: tab session by default; optional “remember on this device”

See [GETTING_STARTED.md](GETTING_STARTED.md) · env: `.env.local.example`

---

## Agent Portal & SETUP

| Feature | Where | Notes |
|---------|-------|-------|
| Auto-detect Grok + Ollama + X | Agent Portal on enter | Connect → tier picks → build chat |
| Model tiers | small / medium / large | Chat · patches · full world scripts |
| Capability matrix | SETUP + Portal | Red ✗ · yellow ⚠ · green ● per model×tier |
| Sequential local runs | SETUP checkbox | Default: one Ollama model at a time |
| Model status HUD | Top float + SETUP | Active model, queue, freeze state |
| Working folder | SETUP + Portal | Memory scope during local Ollama |
| AI memory freeze | Automatic on local run | Screen snapshot, park assets, restore after |
| Multi-step builds | Portal build options | Layout → props → atmosphere |
| Generation policy | `generation-policy.json` | Intensity budgets + MOD required/optional slots |
| Ollama CORS | Local + Pages | `npm run ollama:serve` — not plain `ollama serve` |

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
