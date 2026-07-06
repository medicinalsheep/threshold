# Polish Roadmap — Sprints K onward (v9.0+)

**Current:** v9.6.1 — polish L–P complete: showcase visuals, guided onboarding, survival depth, creator tooling, MP session polish.

**North star:** First impression reads as a **curated game-creation studio**, not a block sandbox — every default surface teaches a shippable feature.

---

## Shipped (Sprints A–J, v8.0–9.0)

| Sprint | Version | Focus |
|--------|---------|-------|
| **A** | 8.0 | Scene undo, compile sandbox, Grok no-clearWorld |
| **B** | 8.1 | Performance HUD, sync status chip |
| **C** | 8.2 | Starter templates, PromptGen cookbook |
| **D** | 8.3 | Nikola NPC, Wardenclyffe dusk lighting |
| **E** | 8.4 | Export & Play, export preflight |
| **F** | 8.5 | Skippable intro, action hints, 5-step tutorial |
| **G** | 8.6 | Guest rebuild registry, audio manifest, sync story |
| **H** | 8.7 | Scene lock, AI run ack, texture manifest |
| **I** | 8.8 | Rebuild telemetry, per-author undo, host handoff |
| **J** | 8.9 | Survival vitals (6 stats, zones, HUD, MP sync) |
| **K** | 9.0 | Gut intro, PLAY/BUILD gate, showcase gateway, doc truth |

---

## Sprint L — Showcase visual polish ✅ (v9.2.0)

**Goal:** Visitor path and lab approach feel authored, not procedural boxes.

| Item | Status | Deliverable |
|------|--------|-------------|
| L1 | ✅ | `makeWardenclyffeSignTex` — readable gateway plaque |
| L2 | ✅ | PlaneGeometry courtyards/path/apron + PBR manifest aliases |
| L3 | ✅ | Stone curb meshes along approach path + gateway curbs |
| L4 | ✅ | Showcase kiosk variant — wood top, copper trim, pedestal |
| L5 | ✅ | Golden hour lock, approach/gateway fill lights, rain lamp dampening |
| L6 | ✅ | `bootstrapStarterScene` awaits `wireStarterTextures()` before spawn |

---

## Sprint M — Guided onboarding polish ✅ (v9.3.0)

**Goal:** Zero overlap confusion on first launch.

| Item | Status | Deliverable |
|------|--------|-------------|
| M1 | ✅ | Single modal stack — `requestAnimationFrame` handoff; no stacked delays |
| M2 | ✅ | BUILD opens SCENE dock on step 3; PLAY pulses vitals HUD on step 4 |
| M3 | ✅ | Replay tour resets `walkthroughDone` + `welcomeSeen` only |
| M4 | ✅ | Lobby restores template + mode; URL `?mode=play` / `?mode=build` |
| M5 | ✅ | Guest/spectate skip mode gate; inherit host pause state |
| M6 | ✅ | Showcase-aligned hints; TC quest after tour complete |

---

## Sprint N — Survival & gameplay depth ✅ (v9.4.0)

**Goal:** Vitals feel like a game system creators can clone, not a demo meter.

| Item | Status | Deliverable |
|------|--------|-------------|
| N1 | ✅ | Remote player vitals pill (HP/F/W sprite) synced via `avatar.v` |
| N2 | ✅ | Inspector survivalKind + ambientZone + zoneRadius + interactHint |
| N3 | ✅ | PromptGen cookbook + referenceLibrary survival/zone entries |
| N4 | ✅ | TC drive snapshots vitals on enter; restores on exit |
| N5 | ✅ | Collapse vignette overlay + thunder/reload stinger |
| N6 | ✅ | Export preflight warns on missing survival hooks in custom worlds |

---

## Sprint O — Creator tooling polish ✅ (v9.5.0)

**Goal:** BUILD mode feels as intentional as PLAY.

| Item | Status | Deliverable |
|------|--------|-------------|
| O1 | ✅ | Checkpoint labels: `label · BUILD/PLAY · authorKey` |
| O2 | ✅ | INSERT → SHOWCASE tab: gateway arch, terminal cluster, survival prop |
| O3 | ✅ | Reference library `v9_creator_flow` card |
| O4 | ✅ | WORKFLOWS: `SurvivalNeeds` API + `applySurvivalWorldHooks` |
| O5 | ✅ | SYNC STORY: avatar.v vitals + survival prop sync scope |

---

## Sprint P — Multiplayer & session polish ✅ (v9.6.0)

**Goal:** Host handoff + collab guardrails feel invisible until needed.

| Item | Status | Deliverable |
|------|--------|-------------|
| P1 | ✅ | `LIVE_STATE` includes `sessionMode` + `avatar.v`; guest vitals HUD toggle in PLAYERS |
| P2 | ✅ | Handoff snapshot stores host vitals + sessionMode |
| P3 | ✅ | Third Eye amber highlight on `userData.locked` objects |
| P4 | ✅ | Reconnect + `applyLiveState` restore mode/vitals from last LIVE_STATE |
| P5 | ✅ | Spectate HUD host vitals pill (HP/F/W) |

---

## Sprint Q — Documentation & site truth ✅ (v9.1.0)

**Goal:** Every entry doc matches v9 UX.

| Item | Status | Deliverable |
|------|--------|-------------|
| Q1 | ✅ | `PRODUCT_ROADMAP.md`, `NEXT_PHASES.md`, `docs/README.md` → v9 + Sprint table |
| Q2 | ✅ | `REALISTIC_GAMEPLAY.md` — survival, gateway, F interact, showcase objects |
| Q3 | ✅ | `CREATIVE_WORKFLOW.md` — PLAY/BUILD first, PromptGen EXAMPLES, EXPORT & PLAY |
| Q4 | ✅ | `referenceLibrary.js` — guided tour, survival, export/play workflows |
| Q5 | ✅ | Lobby release strip + changelog link · `AGENTS.md` path truth |

---

## Sprint R — Documentation truth ✅ (v9.6.1)

**Goal:** Every entry doc matches v9.6 shipped UX.

| Item | Status | Deliverable |
|------|--------|-------------|
| R1 | ✅ | `README.md`, `docs/README.md`, `PRODUCT_ROADMAP.md` → v9.6 + sprint L–P table |
| R2 | ✅ | `REALISTIC_GAMEPLAY.md` — MP vitals, guest HUD, spectate banner, Third Eye lock |
| R3 | ✅ | `CREATIVE_WORKFLOW.md` — SHOWCASE insert, inspector hooks, scene undo labels |
| R4 | ✅ | `ASSET_CAPABILITIES.md` — v9.6 systems table |
| R5 | ✅ | `NEXT_PHASES.md`, `AGENTS.md`, root README version truth |

---

## Recommended order (completed)

```
L → M → Q → N → O → P → R ✅
```

**Next (outside polish):** store/native packaging, gameplay depth beyond vitals, performance (JS chunk split). See [NEXT_PHASES.md](NEXT_PHASES.md).

---

## Out of scope (revisit later)

- Signed store uploads (per-developer keys)
- macOS notarization automation
- VLC / exotic video codecs
- Full local LLM (Ollama) integration

See [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) · [CHANGELOG.md](CHANGELOG.md) · [NEXT_PHASES.md](NEXT_PHASES.md).