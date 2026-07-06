# THRESHOLD SUITE

A collaborative 3D creative playground — design worlds, generate code with AI, record sounds, spawn characters, play together, and **ship games** to stores (Play, Windows, Steam) via a guided export walkthrough.

**Live:** https://medicinalsheep.github.io/threshold/ · **Version:** 9.1.0

---

## Quick start

| Mode | How |
|------|-----|
| **Solo** | Lobby → choose **PLAY** or **BUILD** → **ENTER** — Wardenclyffe showcase site |
| **Host** | Lobby → **CREATE SESSION** → **COPY LINK** → friends open link → **JOIN FRIENDS** |
| **Guest** | Open host's link (or enter room code) → **JOIN FRIENDS** |
| **TC demo** | Lobby → **TC →** — vehicles, NPCs, circuit, full export practice |

```
Lobby → Engine (3D world) ↔ Compiler (code) ↔ PromptGen (AI prompts)
              ↓
     First visit: PLAY/BUILD choice + 6-step guided tour · MORE → TUTORIAL (FULL)
              ↓
     Walk/FPS · PBR textures · footsteps · GLB avatars · EXPORT · ship
```

### First session (recommended)

1. **Lobby** — pick **PLAY** or **BUILD**, then **ENTER** (Wardenclyffe showcase).
2. **Guided tour** — 6-step overlay; mode-aware PLAY/BUILD; **MORE → TUTORIAL** to replay.
3. **Move** — WASD walk, Shift sprint, **F** interact, survival vitals HUD (**V** toggles HUD).
4. **Explore** — lab GLBs north, visitor gateway, Nikola, weather, creek/coffee survival props.
5. **EDIT** — pause, drag panels, **+** insert, Texture tab or **INSERT → GLTF** for GIMP/Blender art.
6. **Hyper** render mode — PBR textures + normal maps on starter meshes.
7. **SAVE WORLD** — **MORE** menu; share `?world=CODE` links.
8. **EXPORT** — 9-step wizard → `.threshold-game.json` ([walkthrough](docs/EXPORT_WALKTHROUGH.md)).

**Developers:** after `git clone`:

```bash
npm install
npm run quickstart        # prints full onboarding path
npm run quickstart -- --pack   # regenerate textures, sounds, avatars, bundle
npm run dev               # http://localhost:5173
```

Full doc index: [docs/README.md](docs/README.md) · Linear path: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) · Realism guide: [docs/REALISTIC_GAMEPLAY.md](docs/REALISTIC_GAMEPLAY.md)

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

### EDIT vs PLAY

| Mode | Badge | World map | Objects | Your avatar |
|------|-------|-----------|---------|-------------|
| **EDIT** | `EDIT` | Unlocked (if permitted) | Inspector: texture, collision, audio | Skin editable |
| **PLAY** | `PLAY` | Locked | View only (host-built) | Skin + player code editable |

- **PAUSE** → EDIT — host (or solo) builds, runs Compiler code, inserts objects
- **PLAY** (resume) → simulation runs; physics active; world locked for non-admins

### Key bindings (action defaults)

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD | L-stick |
| Sprint | Shift | L3 |
| Jump | Space | A |
| Interact | E | X |
| Fire | G | RT |
| Aim (ADS) | R | LT |
| FPS / TPS | V | D-pad Down |
| Third Eye | T | D-pad Up |

Details: [docs/REALISTIC_GAMEPLAY.md](docs/REALISTIC_GAMEPLAY.md)

---

## Asset pipeline (v6.4)

| Step | Command | Output |
|------|---------|--------|
| Full pack | `npm run assets:pack` | textures + avatars + sounds + WebP + build + bundle + kit |
| Real weather SFX | `npm run sounds:fetch:ambient` | Mixkit rain/thunder → OGG |
| Real combat SFX | `npm run sounds:fetch:sfx` | guns, glass, metal, horn, footsteps (Mixkit) |
| Tag your recording | `npm run sounds:tag:recording` | clip + tag field recordings → starter bundle |
| Verify | `npm run assets:verify` | smoke test modules, NPCs, SFX, texture budget |
| GIMP live | `textures:watch` + `dev` | hot-reload on GIMP export |
| Fork pack | `npm run kit:export` | ~1.4 MB WebP starter kit in `exports/starter-texture-kit/` |
| TC rebuild | `npm run tc:build` | GLB+LOD vehicles/characters + PBR textures |

```bash
npm run gimp:install          # GIMP PBR plugin
npm run blender:install       # Blender GLTF addon
npm run blender:avatar -- --blend rig.blend --object Armature
npm run textures:watch        # + npm run dev for live SYNC
```

Guides: [ASSET_CAPABILITIES](docs/ASSET_CAPABILITIES.md) · [GIMP_TEXTURES](docs/GIMP_TEXTURES.md) · [BLENDER_AVATARS](docs/BLENDER_AVATARS.md) · [CREATIVE_WORKFLOW](docs/CREATIVE_WORKFLOW.md)

---

## Creative freedom

Threshold is a **live 3D runtime** with a JavaScript API — not a locked-down game.

- **World building** — fly/walk, insert objects, ENV/EDIT/SKIN/SFX docks, save worlds + Project Vault
- **Code & AI** — Compiler, PromptGen (live scene + sound library), optional Grok edition
- **Characters** — GLB avatars with walk animation, procedural fallback, multiplayer meshes
- **Sound** — record SFX, footstep surfaces, assign collision/interact/ambient clips
- **Multiplayer** — host pauses for co-edit; Admin delegation; export/import JSON

If you can express it in JavaScript against the Three.js scene, you can build it.

---

## Known limitations

| Area | Limitation |
|------|------------|
| **Networking** | PeerJS/WebRTC — host must stay online; strict NAT can block |
| **Players in sync** | Host-authoritative; ~120ms debounce; one shared player snapshot |
| **Audio blobs** | Recordings in IndexedDB per device; metadata syncs, blobs do not |
| **External assets** | GLTF URLs must allow CORS from your origin |

---

## Develop locally

```bash
npm install
npm run quickstart
npm run dev              # Vite :5173
npm run build            # GitHub Pages → dist-pages/
npm run preview          # :4173 smoke test
```

Push to `main` — GitHub Pages updates at the live URL.

### Native packaging

```bash
npm run init:native
npm run package:android:release
npm run package:win
npm run package:steam -- --manifest my-game.threshold-game.json
npm run store:prep -- --manifest my-game.threshold-game.json
```

Guides: [NATIVE_SHELLS](docs/NATIVE_SHELLS.md) · [STORE_RELEASE](docs/STORE_RELEASE.md) · [STEAM_RELEASE](docs/STEAM_RELEASE.md)

### TC assets (bundled originals)

Lobby → **TC →** — Runner, Hauler, Marshal, Mechanic (GLB + LOD), TC Span, checkpoint, SFX, intro cutscene.

```bash
npm run tc:build
npm run tc:verify
npm run tc:ship              # automated export E2E
```

[REFERENCE_EDITIONS](docs/REFERENCE_EDITIONS.md) · [THRESHOLD_CHILD_ASSETS](docs/THRESHOLD_CHILD_ASSETS.md)

### Optional env

| Variable | Purpose |
|----------|---------|
| `VITE_EDITION=grok` | Grok auth + RUN WITH GROK |
| `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | Cloud world sync |
| `VITE_PEER_HOST` | Custom PeerJS relay |

---

## Product roadmap

**Design → Art → Play → Ship → Scale**

| Stage | What (v6.4) |
|-------|-------------|
| **Design** | Engine, Compiler, PromptGen, 9-step tutorial |
| **Art** | GIMP live SYNC, Blender avatars, procedural PBR + HILOD, `kit:export` |
| **Play** | TPS/FPS/ADS, footsteps, Third Eye, TC circuit + drive |
| **Ship** | 9-step EXPORT → `store:prep` → APK / Windows / iOS / Steam |
| **Scale** | Optional **relay/** — [AWS free tier](relay/README.md) |

**Current:** v6.4.1 — realism starter defaults, full asset pipeline, doc index. [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) · [docs/NEXT_PHASES.md](docs/NEXT_PHASES.md) · [docs/CHANGELOG.md](docs/CHANGELOG.md)

---

## Tech

- **Three.js** + **Cannon-ES** + post-processing render modes
- **PeerJS** (WebRTC) — host-authoritative sync
- **IndexedDB** — worlds, projects, sound library
- **Vite** — build tooling

---

## Sponsors

**[github.com/sponsors/medicinalsheep](https://github.com/sponsors/medicinalsheep)**

---

## License

MIT — commercial terms planned as product matures.