# Polish Roadmap — Sprints K onward (v9.0+)

**Current:** v9.0.0 — guided PLAY/BUILD session, showcase gateway, survival vitals (Sprint J), collab guardrails (H–I), export & MP foundation (E–G).

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

## Sprint N — Survival & gameplay depth

**Goal:** Vitals feel like a game system creators can clone, not a demo meter.

| Item | Deliverable |
|------|-------------|
| N1 | Remote player vitals pill above avatar (MP awareness) |
| N2 | Survival zone editor hook — `ambientZone` + `survivalKind` in inspector |
| N3 | PromptGen cookbook entries for survival props + zone scripts |
| N4 | Vehicle / TC drive pauses survival tick; handoff on exit |
| N5 | Collapse recovery UX — screen vignette + audio stinger |
| N6 | Export preflight warns if survival hooks missing in custom worlds |

---

## Sprint O — Creator tooling polish

**Goal:** BUILD mode feels as intentional as PLAY.

| Item | Deliverable |
|------|-------------|
| O1 | Scene history checkpoint labels include mode + author |
| O2 | Insert menu “Showcase snippets” — gateway arch, terminal cluster, survival prop |
| O3 | Reference library card for v9 flow (PLAY/BUILD, survival, export) |
| O4 | Compiler WORKFLOWS: `SurvivalNeeds`, `applySurvivalWorldHooks` examples |
| O5 | Sync story modal section for vitals + survival interact sync scope |

---

## Sprint P — Multiplayer & session polish

**Goal:** Host handoff + collab guardrails feel invisible until needed.

| Item | Deliverable |
|------|-------------|
| P1 | Vitals in `LIVE_STATE` player blob — guest HUD optional toggle |
| P2 | Host migration includes vitals + sessionMode in snapshot |
| P3 | Scene lock indicator on locked objects in Third Eye |
| P4 | Reconnect restores mode + vitals from last LIVE_STATE |
| P5 | Spectate banner shows host vitals summary |

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

## Recommended order

```
L (visual) → M (onboarding) → Q (docs) → N (survival depth) → O (creator) → P (MP)
```

**Fastest user-visible wins:** L1–L3 gateway/path polish, M1–M2 onboarding stack, Q1 doc headers.

---

## Out of scope (revisit later)

- Signed store uploads (per-developer keys)
- macOS notarization automation
- VLC / exotic video codecs
- Full local LLM (Ollama) integration

See [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) · [CHANGELOG.md](CHANGELOG.md) · [NEXT_PHASES.md](NEXT_PHASES.md).