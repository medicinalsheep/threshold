# THRESHOLD SUITE

A collaborative 3D creative playground — design worlds, generate code with AI, record sounds, spawn characters, play together, and **ship games** to stores (Play, Windows, Steam) via a guided export walkthrough.

**Live:** https://medicinalsheep.github.io/threshold/

---

## Quick start

| Mode | How |
|------|-----|
| **Solo** | Lobby → **SOLO PLAY** — full creative control on your device |
| **Host** | Lobby → **CREATE SESSION** → **COPY LINK** → friends open link → **JOIN FRIENDS** |
| **Guest** | Open host's link (or enter room code) → **JOIN FRIENDS** |

```
Lobby → Engine (3D world) ↔ Compiler (code) ↔ PromptGen (AI prompts)
              ↓
     First visit: 9-step tutorial · replay via MORE → TUTORIAL
              ↓
     Insert · SFX · AI agents · EXPORT manifest · PLAY/EDIT
              ↓
     Share link → friends join → keep building together
```

### First session (recommended)

1. **Lobby → SOLO PLAY** — starter scene loads (platform, beacon, Guide NPC).
2. **Tutorial** — 9-step overlay (build, textures, optional AI); **MORE → TUTORIAL** to replay.
3. **EDIT** — drag panels; **+** to insert; **Texture** tab or **INSERT → GLTF** for GIMP/Blender art.
4. **Optional AI** — PromptGen → Compiler, or SCENE → AI agents on NPCs.
5. **PLAY** — test walk/fly; use **Hyper** render mode for PBR textures.
6. **SAVE WORLD** — **MORE** menu; share `?world=CODE` links.
7. **EXPORT** — 9-step wizard (icons, credits, packs, ship) → `.threshold-game.json` ([walkthrough](docs/EXPORT_WALKTHROUGH.md)).
8. **Ship** — `store:prep` → `package:android` / `package:win` / `package:steam` ([store](docs/STORE_RELEASE.md) · [Steam](docs/STEAM_RELEASE.md)).

**Optional:** Lobby → **THRESHOLD CHILD** — GLB+LOD vehicles + circuit to practice export SCENE / CREDITS / PACKS ([Child policy](docs/THRESHOLD_CHILD_ASSETS.md) · [getting started](docs/GETTING_STARTED.md)).

Deeper workflows: Compiler sidebar → **WORKFLOWS** (Quick Start, agents, relay, sounds).

---

## Host & player configuration

Threshold uses **host-authoritative** multiplayer over **PeerJS (WebRTC)**. There is no game server — the host's browser is the session authority.

### Roles

| Role | Who | World editing | Pause | Player list | Invite link |
|------|-----|---------------|-------|-------------|-------------|
| **Host** | Session creator | Yes (in EDIT) | Yes | Manage + grant Admin | Yes |
| **Admin guest** | Host-granted | Yes (in EDIT) | Via host sync | View self | No |
| **Guest** | Joined player | No | No | View self | No |
| **Solo** | You alone | Yes | Yes | N/A | N/A |

### Session identity

- Every player gets a **Player Key** (6 characters) — shown in the toolbar as `YOU`.
- When you **Create Session**, your Player Key **becomes the room code**.
- Invite links look like: `https://medicinalsheep.github.io/threshold/?room=ABC123`

### PLAYERS panel (toolbar → PLAYERS)

Open this as **host** or **guest** to see roles and permissions.

**Host controls:**
- **Invite link** — copy and send to friends
- **Admin checkbox** per joined player — grants trusted guests world-edit powers
- **Auto-pause when host opens Compiler / PromptGen** — pauses the sim so the host can code without guests running ahead (toggle on/off)
- **PUSH CONTROLS TO ALL** — syncs host keyboard + gamepad bindings to every connected player

**Guest view:**
- Shows whether you are **Admin** or a regular **Player**
- Regular guests can still walk/fly, use personal key overrides, and edit **their own avatar skin** in PLAY mode

### EDIT vs PLAY (the core rule)

| Mode | Badge | World map | Objects | Your avatar |
|------|-------|-----------|---------|-------------|
| **EDIT** | `EDIT` | Unlocked (if you have permission) | Inspector: texture, collision, audio | Skin editable |
| **PLAY** | `PLAY` | Locked | View only (host-built) | Skin + player code editable |

- **PAUSE** → EDIT — host (or solo) builds, runs Compiler code, inserts objects
- **PLAY** (resume) → simulation runs; physics active; world locked for non-admins
- Guests without Admin can **request** world actions; the host executes and broadcasts state

### Key bindings (KEYS menu)

Two profiles in the bindings editor:

| Profile | Purpose |
|---------|---------|
| **Host / Solo** | Default layout + **Pause Scene** binding |
| **Guest** | Personal overrides; pause binding disabled |

Host can **push** their layout to all guests. Guests can still override locally in the Guest profile.

### What syncs in a session

- World objects (mesh transforms, `userData`, physics flags)
- Environment (time, fog, water, atmosphere, render mode)
- Running Compiler code
- Pause / PLAY state
- Admin list
- Host control bindings (when pushed)
- Host player position (single shared player snapshot — see limitations)

### What does **not** sync automatically

- Recorded **sound blobs** (stored locally per device — only clip **IDs** in object metadata sync)
- Compiler input drafts, PromptGen text, UI panel positions (saved per browser)
- Guest personal keybinding overrides (unless host pushes)

---

## Creative freedom (what you *can* do)

Threshold is deliberately **not** a locked-down game — it is a **live 3D runtime** with a JavaScript API.

### World building
- Fly or walk the scene; right-click / hold / **+** to insert
- Drag **TOOLS** and **SCENE** panels anywhere; **LOCK** when placed
- **FULL** for immersive view (touch-friendly exit button on mobile)
- ENV / EDIT / SKIN / **SFX** dock tabs
- Save worlds (`SAVE WORLD` / `?world=CODE` links) and full **Project Vault** (world + scripts)

### Code & AI
- **Compiler** — write or paste JS, transpile, **RUN IN ENGINE**
- **PromptGen** — include live scene + **sound library** so AI references your recorded clips
- **Grok edition** — direct script generation (optional `VITE_EDITION=grok`)
- Full globals: `World`, `Engine`, `THREE`, `Physics`, `PlayerController`, `Runtime`, `AudioSys`, etc.
- Reference library built in (workflows, players, worlds, techniques)

### Characters & animation
- Procedural human avatars with walk + idle animation
- GLTF/GLB model URLs for custom skins
- NPC humans with continuous idle animation
- Physics objects, collisions, rotating props, custom materials

### Sound
- Record via mic in **SFX** tab or post-insert prompt
- Assign clips to objects: collision, interact, emote/walk, ambient
- Reference clips in PromptGen so AI wires `userData.soundClipId` in generated code
- Synth tones still available as fallback

### Multiplayer creativity
- Host pauses → everyone edits together (admins code/build)
- Host plays → shared world becomes a playground
- Delegate **Admin** to co-designers without sharing your machine
- Export/import scene JSON; share player profiles as `.json` files

**Bottom line:** if you can express it in JavaScript against the Three.js scene, you can build it — from ambient art installations to physics puzzles to AI-generated worlds with custom footstep sounds.

---

## Known limitations (honest)

| Area | Limitation |
|------|------------|
| **Networking** | PeerJS/WebRTC — host must stay online; strict firewalls/NAT can block connections; no dedicated relay server in the default deploy |
| **Room codes** | Room ID = host Player Key; rare collisions if ID is taken (retry Create Session) |
| **Authority** | Guests never mutate the world locally — actions go to host; ~120ms broadcast debounce |
| **Players in sync** | One shared player snapshot from host state — not full per-guest avatar replication yet |
| **Audio files** | Recordings live in browser IndexedDB per device; metadata syncs, blobs do not |
| **Cloud** | Worlds/projects save locally; optional Supabase cloud requires env keys in your build |
| **Code execution** | `eval()` in-browser — powerful by design, not a sandbox; trust your session participants |
| **Mobile** | iOS fullscreen uses CSS immersive fallback; mic requires HTTPS + permission |
| **External assets** | GLTF URLs must allow CORS from the live origin |

These are engineering boundaries, not creative ones. Workarounds: save/share worlds via links, export JSON, use AI + Compiler for procedural content, assign sounds per-object after sync.

---

## Feature overview

### Insert menu (+ or right-click)

| Tab | Action |
|-----|--------|
| Character | Spawn NPC human |
| Spawn as Player | Playable walker avatar |
| Player Key | Insert another player's exported profile |
| Saved | Use a locally saved player |
| Code | Run custom JavaScript at cursor |

### PromptGen

- **Include live scene** — objects, env, running code, session info
- **Include sound library** — pick which recorded clips AI should reference
- Task types: extend world, player/avatar, map layout, workflow, audit

### Compiler

- Transpile → **CHECK CODE READY** → **RUN IN ENGINE**
- Project Vault: save/load scripts + world snapshot together
- Running code panel shows live executed scripts

### Mobile & touch

- **TOUCH** toggle for on-screen sticks + buttons
- Drag floating panels; portrait/landscape clamping
- Tap **FULL** for immersive mode

---

## Develop locally

```bash
npm install
npm run dev          # local dev server
npm run build        # production build (GitHub Pages)
```

Push to `main` — GitHub Pages updates automatically at the live URL above.

### Native packaging & store

```bash
npm run init:native       # first time: Capacitor Android + iOS project
npm run package:android:release
npm run package:win       # Windows portable .exe (Electron)
npm run package:steam -- --manifest my-game.threshold-game.json
npm run store:prep -- --manifest my-game.threshold-game.json
npm run store:assets -- --manifest my-game.threshold-game.json
npm run electron:dev      # preview desktop shell
```

Guides: [NATIVE_SHELLS](docs/NATIVE_SHELLS.md) · [STORE_RELEASE](docs/STORE_RELEASE.md) · [STEAM_RELEASE](docs/STEAM_RELEASE.md) · [EXPORT_WALKTHROUGH](docs/EXPORT_WALKTHROUGH.md)

### Threshold Child assets (bundled originals)

Lobby → **THRESHOLD CHILD** spawns Runner + Hauler (GLB + LOD) and Circuit Span — original Threshold Child assets.

```bash
npm run child:vehicles:build   # (re)generate GLB+LOD into import/
npm run reference:fetch        # optional dev-only CC0 seeds → reference/_dev-seeds/ (gitignored)
```

[docs/THRESHOLD_CHILD_ASSETS.md](docs/THRESHOLD_CHILD_ASSETS.md) · [docs/REFERENCE_EDITIONS.md](docs/REFERENCE_EDITIONS.md) · [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)

Full guide: [docs/NATIVE_SHELLS.md](docs/NATIVE_SHELLS.md)

### Creative pipeline (shipped)

```bash
npm run gimp:install      # GIMP PBR export plugin
npm run blender:install     # Blender GLTF addon
npm run textures:watch    # dev hot-reload (with npm run dev)
npm run blender:export -- --blend scene.blend --object "Stone Block"
```

Guides: [docs/CREATIVE_WORKFLOW.md](docs/CREATIVE_WORKFLOW.md) · [docs/CREATIVE_PLUGINS.md](docs/CREATIVE_PLUGINS.md)

Brand icons: `npm run build:icons` · **Gamepad:** A/Cross jump · **L3** sprint · R-stick camera.

Optional env (`.env` / build modes):

| Variable | Purpose |
|----------|---------|
| `VITE_EDITION=grok` | Grok auth + RUN WITH GROK |
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | Cloud world/project sync |
| `VITE_BASE_PATH` | Deploy path if not site root |

---

## Sponsors

Support ongoing development:

**[github.com/sponsors/medicinalsheep](https://github.com/sponsors/medicinalsheep)**

---

## Product roadmap (v5.5)

**Design → Art → Play → Ship → Scale**

| Stage | What |
|-------|------|
| **Design** | Engine, Compiler, PromptGen, SFX, 9-step tutorial |
| **Art** | GIMP, Blender, **Threshold Child** originals, `textures:watch` |
| **Play** | Solo / host / guest, EDIT·PLAY, graphics tiers, cutscenes |
| **Ship** | 9-step EXPORT → `store:prep` → APK / Windows / iOS / **Steam** |
| **Scale** | Optional **relay/** — [AWS free tier](relay/README.md) |

**Current:** v5.7.0 — R3 Child showcase (characters, audio, full export demo). [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) · [docs/NEXT_PHASES.md](docs/NEXT_PHASES.md) · [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md)

---

## Tech

- **Three.js** + **Cannon-ES** physics + post-processing render modes
- **PeerJS** (WebRTC) — host-authoritative sync; optional custom relay via `VITE_PEER_HOST`
- **IndexedDB** — worlds, projects, sound library
- **Vite** — build tooling

---

## License

MIT — commercial terms planned as product matures (see prior README discussion).