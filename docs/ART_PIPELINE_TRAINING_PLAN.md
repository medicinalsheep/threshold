# Art pipeline — audit findings & training plan

**Date:** 2026-08-12 · **Version:** 10.21.4+  
**Related:** [ASSET_CAPABILITIES.md](ASSET_CAPABILITIES.md) · [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) · [BOOTCAMP.md](BOOTCAMP.md) · [_audit_10.21_features.md](_audit_10.21_features.md)

---

## What we audited

| Layer | How | Runner / command |
|-------|-----|------------------|
| Disk textures / GLBs | File inventory + HILOD coverage | `npm run art:audit` |
| Pipeline scripts | Presence of gen/export tools | same |
| Starter verify | Modern starter stack | `node scripts/assets-verify.cjs` |
| Kit export | Optional ship packs | `node scripts/kit-verify.cjs` |
| Local minis | Intent / coach / codegen / plans | art-pipeline-audit Ollama probes |
| Product path | AgentRouter sanitizer (what users run) | `finalizeAgentCode` / `sanitizeAgentSlop` |
| Engine naming | Block 5 (prior) | `node scripts/block5-art-audit.cjs` |

---

## Findings (closed session)

### Texture generation — strong

- **279 PNG** + matching WebP; **27/27** albedo masters have `_1k` (100% HILOD on audited masters).
- Generators: `tc:gen:tex`, `textures:gen:default`, handpaint, `textures:hilod`.
- Manifest: `textures/threshold_manifest.json` (GIMP format) — **engineVersion still 10.13.21** (warn only).
- GIMP plugin + `textures:watch` → TextureBridge hot reload.
- MaterialPresets library — correct agent path for hero surfaces.

### Model generation — strong

- **33** `import/*.glb` — starter avatars (+ LOD), hair, NPCs, TC vehicles, lab props.
- Generators: `avatar:gen`, `tc:gen:chr/veh`, Blender export CLI/addons.
- Runtime: gltfImport, MeshLod, AvatarLod (Block 6 PASS earlier).

### Local mini behavior (qwen2.5-coder:1.5b / llama3.2:3b)

| Behavior | Raw mini | Product path (after sanitizer) |
|----------|----------|--------------------------------|
| Slug paths (`mat_brick_wall`) | PASS after art_pipeline train | PASS |
| Intent HILOD | PASS | PASS |
| Plan Mat Wood Crate | PASS | PASS |
| Stone Block codegen | Often renames to Mat Stone Crate; wrong textureHint | **Name + hint realigned** |
| CanvasTexture “fix” | Still echoes `CanvasTexture` / `MeshBasicMaterial` | **Lines stripped; MaterialPresets kept/injected** |

**Lesson:** 1.5b few-shot minis improve with `art_pipeline.jsonl`, but they still mix names and echo broken input. **Train + product sanitizer** is the durable stack — not train alone.

### Residual ops (not train)

| Issue | Severity | Action |
|-------|----------|--------|
| Manifest `engineVersion` stale | Low | Bump on next texture gen |
| Kit pack missing | Ops | `npm run kit:export && kit:verify` |
| Raw mini canvas echo | Soft | WARN `O-dev-anti-canvas-raw` — keep few-shots; sanitizer is hard gate |
| Name/hint drift raw | Soft | WARN when sanitizer rewrites |

---

## Improvements shipped this pass

### Audit

1. **`scripts/art-pipeline-audit.cjs`** + `npm run art:audit` → `dist-store/art-pipeline-audit.json`
2. Scores **product-sanitized** mini output for hard pass; **raw** echo → warn only
3. **`assets-verify`** modernized (grid + starter_avatar, realistic disk budget)

### Training

4. **`datasets/small|medium/art_pipeline.jsonl`** — slug law, MaterialPresets, TextureBridge APIs, anti-canvas patches
5. **bootcamp.json** — art_pipeline early; medium `maxExamples` **160**
6. **bootcamp-lib** — SYSTEM forbids CanvasTexture / MeshBasic; entryPriority for clean anti-canvas + Stone Block pairs
7. **models:mini** recreated locally after art_pipeline wire

### Product (local-model reliability)

8. **`sanitizeAgentSlop`** (`agentPrompts.js`):
   - Strip `CanvasTexture` / `MeshBasicMaterial` map assignments
   - Inject `MaterialPresets.applyMaterialPreset` when needed
   - **Align createObject Name** to art names in the user request (Stone Block, Mat Wood Crate, …)
   - **Align `textureHint`** to Name slug (`textures/stone_block_albedo.png`)
9. **`codeSanitizer.js`** — same canvas strip on live build / compiler path

### Latest score

```
art-pipeline-audit — PASS · 19/19 hard · 3 warn
assets-verify — PASS
```

---

## Training plan (wave: art pipeline)

### Dual-layer strategy

| Layer | Role |
|-------|------|
| **Few-shots** (`art_pipeline.jsonl` + safety) | Teach intent, plans, slug vocabulary, MaterialPresets shape |
| **SYSTEM prompt** | FORBIDDEN: CanvasTexture / MeshBasic / bare TextureBridge.apply |
| **sanitizeAgentSlop** | Hard gate for users — never ship echoed canvas / name drift |
| **art:audit** | Regression gate after every retrain |

Do **not** expect raw 1.5b to be perfect AG3. Expect **product path** perfect.

### Goals (model + code)

1. **Slug law:** Engine Name → lowercase underscore paths only  
   `Mat Brick Wall` → `textures/mat_brick_wall_albedo.png` · `import/mat_brick_wall.glb`
2. **textureHint always matches Name**
3. **MaterialPresets before maps;** never CanvasTexture / MeshBasic for heroes
4. **TextureBridge:** `applyFromUserData` / `applyPathToObject` only
5. **Plans** include GIMP filter path + `textures:watch` + optional `blender:export`
6. **HILOD** intent → texture · `textures:hilod`

### Dataset sources

| Source | Use |
|--------|-----|
| `datasets/*/art_pipeline.jsonl` | Primary few-shots |
| `origin.jsonl` medium plans | GIMP+Blender pipelines |
| Compiler **EXPORT TRAINING PAIR** | Real failures → `bootcamp:import` |
| Safety / critical | clearWorld, scene bootstrap, canvas variants |

### Retrain recipe

```bash
# After editing JSONL
npm run bootcamp:build
npm run models:mini

# Or
npm run train:mini -- --no-seed

# Verify
npm run art:audit
node scripts/block5-art-audit.cjs
npm run ollama:golden   # optional regression
```

**SETUP → AGENTS:** Small `threshold-mini-npc` · Medium `threshold-mini-dev` · **SAVE TIERS**

### Acceptance (AG1–AG6)

| ID | Prompt class | Pass if (product path) |
|----|--------------|------------------------|
| AG1 | Paths for Mat Brick Wall | only `mat_brick_wall` slug |
| AG2 | Stone Block codegen | Name `Stone Block` + `stone_block_albedo` + MaterialPresets + mode 4 |
| AG3 | CanvasTexture fix | no live CanvasTexture/MeshBasic; cube; MaterialPresets |
| AG4 | Intent GIMP export | INTENT texture · Export PBR Maps / textures:watch |
| AG5 | Intent HILOD | INTENT texture · textures:hilod |
| AG6 | Plan Mat Wood Crate | mat_wood_crate paths consistent |

Fail any AG* hard → add pair **or** tighten sanitizer → rebuild → retest.  
Prefer sanitizer for **echo bugs**; prefer few-shots for **intent / plan / vocabulary**.

---

## Ongoing audit plan

### Cadence

| When | What |
|------|------|
| Every art train | `npm run art:audit` (hard fails = 0) |
| Weekly / pre-ship | `assets-verify` · `block5-art-audit` · optional `kit:export` |
| After GIMP/Blender sessions | EXPORT TRAINING PAIR → `bootcamp:import` |
| Full product | Blocks 1–9 runners already in repo |
| Publish minis | only when art:audit green + ollama:golden clean |

### Ops checklist (assets, not model)

```bash
npm run textures:hilod          # if masters lack _1k
npm run tex:compress            # WebP if needed
npm run kit:export && npm run kit:verify
npm run assets:pack             # Pages bundle
# optional: bump threshold_manifest engineVersion on next gen
```

### Do not

- Train minis to invent image pixels (they coach + wire Engine, not paint)
- Use `TextureBridge.apply(mesh)` bare in gold answers
- Allow PascalCase or spaced texture paths in gold answers
- Force Ollama on **player** surface
- Grow `maxExamples` unboundedly (prefer priority + sanitizer)

---

## Wave 8 seed (shipped)

```bash
npm run bootcamp:seed:wave8
npm run train:mini -- --wave8
npm run art:audit
```

| Dataset | Content |
|---------|---------|
| `small/wave8_art.jsonl` | intents, coaches, guides (slug / kit / HILOD / bridge) |
| `medium/wave8_art.jsonl` | anti-canvas patches, Stone Block codegen, plans, kit ship plan |

Also: `config/starter-kit.json` v2 uses live Mat* + Starter Ground + AI Build Station;  
`textures/threshold_manifest.json` `engineVersion` → **10.21.4**.

## Suggested next session order

1. ~~kit:export + manifest bump + wave8~~ **done**
2. Optional unit tests for `sanitizeAgentSlop` canvas + name alignment
3. Publish minis when ready: `npm run models:publish -- --all`
4. More pairs from real Compiler **EXPORT TRAINING PAIR** via `bootcamp:import`

---

## Success criteria

| Gate | Status (2026-08-12) |
|------|---------------------|
| art-pipeline-audit hard fails = 0 | **PASS 18/18** after wave8 (+ kit + manifest) |
| HILOD ≥ 70% masters with `_1k` | **100%** (27/27) |
| kit:verify | **PASS** (80 texture files · Mat* pack) |
| manifest engineVersion | **10.21.4** |
| Raw mini AG3 perfect | Soft warn only — sanitizer owns ship quality |
| kit + bundle | kit local `exports/` (gitignored) · re-run `kit:export` |
