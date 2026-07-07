# Realistic Gameplay — controls, survival & optional showcase

**Default spawn (10.0+):** blank grid. This guide covers **action controls**, optional **survival**, and the **Wardenclyffe showcase** layer (INSERT → SHOWCASE or TC →).

**Graphics:** realistic PBR on all tiers (Lite/Mobile/Realistic/Ultra). Retro shaders opt-in via SCENE → ENV → Style.

---

## Session modes

| Mode | Badge | Simulation | Best for |
|------|-------|------------|----------|
| **PLAY** | `PLAY` | Physics, weather, survival, walk | Playtesting, exploring, MP guests |
| **EDIT** | `EDIT` | Paused — world editable | Insert, delete, Compiler, textures, agents |

**ENTER →** solo defaults **BUILD** (EDIT). **CREATE SESSION** uses lobby PLAY/BUILD picker. Deep link `?mode=play` / `?mode=build`. Toggle anytime via top-left **EDIT** / **PLAY** badge.

---

## Action controls (TPS / FPS)

| Action | Keyboard | Gamepad |
|--------|----------|---------|
| Move | WASD | L-stick |
| Sprint | Shift (hold) | L3 (hold) |
| Crouch | Ctrl (hold) | LT (hold) |
| Stealth walk | Alt (hold) | — |
| Jump | Space | A |
| **Interact** | **F** | X / Square |
| Enter vehicle | E | Y |
| Aim (ADS) | **LMB** (hold) | LT (hold) |
| Fire | **RMB** · G | RT |
| Reload | R | LB |
| Melee | B | B |
| Holster | Z | B |
| Flashlight | L | LB |
| Horn | H | D-pad Left |
| Voice PTT | N (hold) | LB |
| Toggle FPS / TPS | V | D-pad Down |
| Toggle vitals HUD | V (when HUD focused) | — |
| Third Eye | M / F (no target) | D-pad Up |
| Walk / fly | Y | Y |
| Look behind | O | D-pad Left |

Full reference: [CONTROLS.md](CONTROLS.md)

- **TPS** is the default after spawn at the visitor gateway.
- **Mouse look** — in PLAY, **click the canvas** for pointer lock; **Esc** releases. In BUILD, orbit controls work around your character.
- **FPS** hides the body mesh and shows arms viewmodel + crosshair; **ADS** zooms FOV.
- **Third Eye** highlights interactables / NPCs within ~18m; **locked** objects glow amber when in range.

---

## Survival vitals (PLAY mode)

Six coupled stats (0–100): **health**, **food**, **water**, **rest**, **stamina**, **stress**.

| System | Behavior |
|--------|----------|
| Drain | Food/water/rest tick down in PLAY; sprint and rain increase exertion; **night** (20:00–06:00) drains rest faster |
| Sprint gate | Low food/water/stamina blocks sprint; speed scales with debuffs |
| Zones | Creek, coffee nook, lab interior — passive recovery + shelter; zone labels appear as HUD chips |
| Interact | **F** at coffee (food), creek (water), benches (channeled rest); hints show `+food` / `+water` / `+rest` |
| HUD | Top-right vitals bars + rest progress; press **V** to toggle visibility |
| Warnings | Low food/water/health trigger status + ambient SFX (45s cooldown) |
| Side quest | **Survival Run** card after tour — hold all vitals above 35% for 3 minutes |
| Nikola | Near Nikola with critical vitals — contextual bark + chirp |
| MP | `avatar.v` in `LIVE_STATE`; remote **HP/F/W pill** above other players |
| Guest HUD | **PLAYERS** panel → optional **Show my vitals HUD** |
| TC drive | Vitals frozen during vehicle; restored on exit |
| Collapse | Red vignette + audio stinger at critical health |

Wire your own props: set `survivalKind` in **SCENE → EDIT**, or `interactAction: 'survival'` + `applySurvivalWorldHooks()` in Compiler.

---

## Movement recipe

Default player tuning (`src/engine/player.js`):

- Walk **3.2 m/s**, sprint up to **~6.0 m/s** (modified by survival)
- Camera-relative accel/decel
- Capsule collider + ground raycast for jump
- OrbitControls **disabled** in walk PLAY mode

Tune `WALK_SPEED`, `SPRINT_MULT`, `ACCEL`, `DECEL` in `player.js` for your game.

---

## NPC recipe

1. `spawnHumanWithAvatar` or `HumanMesh.build`
2. `userData`: `isCharacter: true`, `thirdEyeTarget: true`, `interactAction`, `interactRadius`
3. Optional patrol: `NpcPatrol.register(npc, waypoints, speed)`

**Showcase roster:** **Alex** (PromptGen guide, visitor path), **Nikola** (lab, Tesla interact), courtyard/wildlife ambient NPCs from site modules.

---

## Texture recipe

```bash
npm run tex:gen        # procedural PBR PNG + HILOD tiers
npm run tex:compress   # PNG → WebP sidecars
npm run bundle:assets  # copy to dist-pages/bundle/
```

Full map: [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md)

- Manifest: `textures/threshold_manifest.json` — `objectName` matches `userData.name`.
- Site meshes wire via `wireStarterTextures()` after bootstrap.
- GIMP SYNC via Texture tab on selected meshes.

---

## Audio recipe

```bash
npm run sounds:gen       # procedural starter clips
npm run sounds:fetch:ambient   # rain/thunder/wind
```

Zone audio: creek, coffee murmur, lab hum, highway Doppler — see [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md).

---

## Physics checklist

- Static colliders: `Physics.addStaticBox` on terrain/apron/gateway posts
- Player material: higher friction, low restitution
- Courtyard props: realistic mass on interactables
- Default contact: friction **0.48**, restitution **0.12**

---

## Export / playtest loop

1. `npm run preview` — lobby → **ENTER**
2. **PLAY** — walk gateway path → lab · **F** terminals · survival props
3. **BUILD** — edit collisions / textures / Compiler scripts
4. **MORE → EXPORT & PLAY** or full EXPORT wizard

---

## Showcase site objects (Wardenclyffe default)

| Object / zone | Purpose |
|---------------|---------|
| **Visitor gateway** | Spawn approach — stone arch, lamps, gravel inlay |
| **Site terrain** | Grass field, concrete courtyard, gravel path to lab |
| **Terminals** | AI Build, Avatar Kiosk, Compiler Kiosk on approach |
| **Alex** | Creative guide — **F** → PromptGen |
| **Tesla lab GLBs** | Building shell, interior bench, coil, Nikola |
| **Courtyard194** | Barrels, lamps, work bench, period clutter |
| **Env14** | Creek (water survival), power lines, fence |
| **Interior17** | Coffee nook, door RP, shop counter |
| **Urban16** | Highway traffic, billboard, construction |
| **Weather** | Rain layers, wet glass, dusk lighting (195) |

Replace or extend via PromptGen **EXAMPLES** — avoid `World.clearWorld()` unless resetting intentionally.

**First clone?** `npm run quickstart -- --pack` then `assets:verify` before `preview`.

---

## Multiplayer (guest / spectate)

| Feature | Where |
|---------|--------|
| Remote vitals pill | HP/F/W sprite above other players (`avatar.v`) |
| Guest vitals HUD | **PLAYERS** → **Show my vitals HUD** (optional) |
| Reconnect | Restores `sessionMode` + vitals from last `LIVE_STATE` |
| Handoff | **SAVE & HANDOFF** includes host vitals + mode in snapshot |
| Spectate | Banner shows host HP/F/W when sync available |
| Sync scope | **MORE → SYNC STORY** — vitals, survival props, manifests |

---

## Phase history (site + systems)

| Version | Focus |
|---------|-------|
| **9.6** | MP vitals sync, reconnect, spectate banner, Third Eye lock |
| **9.4** | Survival depth, inspector hooks, collapse UX |
| **9.3** | Guided onboarding stack, `?mode=` deep link |
| **9.2** | Gateway sign, golden hour, PBR path |
| **9.0** | Guided PLAY/BUILD, gateway, 6-step tour |
| **8.9** | Survival vitals (6 stats, zones, HUD, MP) |
| **8.0–8.8** | Undo, perf HUD, templates, export/play, MP sync, collab guardrails |
| **7.9** | Wardenclyffe unified site, building GLBs, courtyard PBR |
| **7.1** | Interior RP audio (coffee, door, elevator) |
| **6.5–6.8** | Action controls, weather, creek, wildlife, highway |

Detail: [CHANGELOG.md](CHANGELOG.md) · [ROADMAP.md](ROADMAP.md)