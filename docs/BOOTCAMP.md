# Threshold Training Bootcamp

**In-repo (GitHub):** `training/bootcamp/` — JSONL datasets + generated Modelfiles (text only).  
**Local:** Ollama weights via `ollama pull` — never committed.

See [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) for GitHub vs local policy.

---

## Quick start (any clone)

```bash
# JSONL → Modelfiles → ollama create (threshold-mini-npc + threshold-mini-dev)
npm run train:mini -- --no-seed

# Or step-by-step:
npm run bootcamp:build
npm run models:mini
```

In Engine: **SETUP / AGENTS** → Small `threshold-mini-npc` · Medium `threshold-mini-dev` → **SAVE TIERS**.

| Model | Tier | Base pull (Ollama) | Trained on |
|-------|------|--------------------|------------|
| `threshold-mini-npc` | Small | `llama3.2:3b` | intent, NPC coaches, recovery |
| `threshold-mini-dev` | Medium | `qwen2.5-coder:1.5b` (**instruct**, not `-base`) | patches, plans, perf, safety |
| `threshold-dev` | Large | `qwen2.5-coder:7b` | full scenes (optional) |
| `threshold-large-scenes` | Large | `llama3.1:8b` | full scenes (optional) |

Optional large: `npm run models:large -- --yes` (multi‑GB download).

---

## Rebuild curated corpora (maintainers)

Seed scripts rewrite/merge JSONL under `training/bootcamp/datasets/`:

```bash
npm run bootcamp:seed              # base curated set
npm run bootcamp:seed:wave2        # whole-product coverage
npm run bootcamp:seed:wave3        # production plans, HILOD/WebP, Lite/Mobile
npm run bootcamp:seed:wave4        # anti-slop, host/guest, recovery, plan↔code
npm run bootcamp:seed:critical     # intent format + render-mode hard fixes
npm run bootcamp:build && npm run models:mini
```

One-shot full pipeline:

```bash
npm run train:mini -- --full           # all seeds + build + create
npm run train:mini -- --full --golden  # + local regression (needs Ollama)
npm run ollama:golden                  # format / safety / plan smoke suite
```

---

## Datasets (in repo)

| Path | Role |
|------|------|
| `datasets/small/classify.jsonl` | Intent router (`INTENT:` / `API:`) |
| `datasets/small/npc.jsonl` | In-character + product coaches |
| `datasets/small/critical.jsonl` | Priority few-shots (format / modes) |
| `datasets/small/guide.jsonl` | Short API facts |
| `datasets/small/safety_npc.jsonl` | MP host/guest, recovery, export coaches |
| `datasets/medium/compiler.jsonl` | Patches + suggests (World API) |
| `datasets/medium/critical.jsonl` | API + render-mode drills |
| `datasets/medium/planning.jsonl` | `production_plan` task (11-step pipeline) |
| `datasets/medium/plan_code.jsonl` | Plan↔code hero pairs |
| `datasets/medium/performance.jsonl` | HILOD / Lite / sequential Ollama |
| `datasets/medium/safety.jsonl` | Anti-slop (no clearWorld / THREE.Scene) |
| `datasets/large/scenes.jsonl` | Full pause-guard IIFEs |
| `datasets/raw/` | Compiler **EXPORT TRAINING PAIR** imports |

---

## Agent tasks

| Task | Tier | Notes |
|------|------|--------|
| `intent_classify` | small | Two-line INTENT/API; runtime repairs for mode drift |
| `npc_chat` | small | Only when “You are … Player says” |
| `dev_patch` / `dev_suggest` | medium | JS only; `finalizeAgentCode` sanitizes slop |
| `production_plan` | medium | PLAN text before codegen |
| `scene_script` | large | Full IIFE |

---

## Grow from Compiler (UI)

1. SMART DEV → review output  
2. SETUP → **EXPORT TRAINING PAIR**  
3. Move into `training/bootcamp/datasets/raw/`  
4. `npm run bootcamp:import -- --file …`  
5. `npm run train:mini -- --no-seed`

---

## Optional ramdisk (local only, gitignored)

```json
// config/bootcamp.local.json
{ "root": "Z:/Threshold training bootcamp" }
```

Or `BOOTCAMP_ROOT` env. Never push local paths.

---

## Related

- [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md)  
- [AGENT_ROUTING.md](AGENT_ROUTING.md)  
- [CAPABILITIES.md](CAPABILITIES.md)  
