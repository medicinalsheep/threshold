# Feature audit matrix — Threshold 10.20.1

**Program complete:** multi-phase audit → polish → entry → shape → wardrobe → wave7 train → doc ship  
**Closed:** 2026-08-04 · **Version:** see `src/config.js` → `VERSION`

Static verifies (Phase 6): portal-ui · modes · physics · controls · negative-lod · version:sync.

---

## Status legend

| Tag | Meaning |
|-----|---------|
| **shipped** | Ready for creators; docs match |
| **polish** | Works; optional nits only |
| **deferred** | Explicit non-goal / ops-bound |

---

## Systems

| System | Status | Owner paths | Verify / smoke |
|--------|--------|-------------|----------------|
| Lobby / surfaces | shipped | `lobby/main.js`, `surfaceProfile.js` | ENTER solo; `?surface=` |
| Modes PLAY/ARRANGE/EDIT | shipped | `simMode.js`, `arrangeMode.js`, `cornerHub.js` | modes-verify |
| Play as | shipped | `playAs.js` | solo + empty host · **K** |
| Quality ladder | shipped | `qualityLadder.js` | INSERT QUALITY |
| Grid / snap | shipped | `gridSystem.js` | SCENE cell size |
| Agent Portal | shipped | `agentPortal.js` | BUILD SOMETHING → GENERATE |
| Live build | shipped | `liveBuild.js`, `buildJob.js` | live apply · undo · focused 3-step |
| Materials / textures | shipped | `materialLibrary.js`, `textureBridge.js` | INSERT · textures:watch |
| Physics / kit | shipped | `physics.js`, `starterKit.js` | physics-verify |
| Neg LOD / Vis E0–E5 | shipped | `negativeLod.js`, `visibilitySystem.js` | negative-lod-verify |
| Body shape | shipped | `appearanceProfile.js`, `humanMesh.js` | SKIN shape sliders |
| Wardrobe | shipped | `clothingLayout.js`, `avatarMod.js` | SKIN slot rail + catalog |
| Appearance export | shipped | `appearanceExport.js` | mods + shape JSON |
| Multiplayer / VOIP | shipped | `network.js`, `sync.js`, `voip.js` | CREATE/JOIN |
| Training bootcamp | shipped | wave1–7 | `train:mini -- --wave7` |
| TC DEMO lobby | **removed** | — | 10.20 |
| Survival pack | deferred | `dev/survival/` | `dev:survival` only |
| Store notarize / Steam real | deferred | ops + certs | store:verify scripts OK |
| Trellis / Veo | deferred | registry only | — |

---

## Program phases (all done)

| Phase | Focus | Version |
|-------|--------|---------|
| **0** | Audit matrix + verifies | 10.16 |
| **1** | Live undo · play-as · export mods | 10.16.1 |
| **2** | Entry → build | 10.17.0 |
| **3** | Body shape | 10.18.0 |
| **4** | Clothing wardrobe | 10.19.0 |
| **5** | Training wave7 · TC DEMO out | 10.20.0 |
| **6** | Doc truth sweep · CAPABILITIES spine | **10.20.1** |

---

## Residual optional nits (not blockers)

| Item | Note |
|------|------|
| Free-pointer look while play-as | Soft sticky feel (`_review_10.15.6` #11) |
| MP play-as replication | Explicitly deferred |
| Local `train:mini -- --full --golden` | Maintainer machine + Ollama |
| `models:publish` | Maintainer only |

---

## Truth sources

| Doc | Role |
|-----|------|
| [BUILD_FROM.md](BUILD_FROM.md) | One-page spine |
| [CAPABILITIES.md](CAPABILITIES.md) | Shipped snapshot |
| [ROADMAP.md](ROADMAP.md) | History + open/deferred |
| [CHANGELOG.md](CHANGELOG.md) | Version bullets |
| [BOOTCAMP.md](BOOTCAMP.md) · [TRAINING_BACKLOG.md](TRAINING_BACKLOG.md) | Mini train |
| [AGENTS.md](../AGENTS.md) | Repo map for agents |
