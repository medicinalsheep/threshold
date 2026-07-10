# Threshold Training Bootcamp (in-repo)

**On GitHub:** JSONL examples + generated Modelfiles (text only).  
**Not on GitHub:** Ollama weight files (GB), `.env.local`, `bootcamp.local.json`.

## Train mini agents (recommended)

```bash
# Full power: all waves + critical + Modelfiles + ollama create
npm run train:mini -- --full

# Full + golden regression (requires Ollama running)
npm run train:mini -- --full --golden

# Rebuild from existing JSONL only
npm run train:mini -- --no-seed

# Individual waves
npm run bootcamp:seed:wave4    # safety + plan/code + recovery
npm run ollama:golden          # mini model regression suite
```

| Model | Tier | Base pull | Trained on |
|-------|------|-----------|------------|
| `threshold-mini-npc` | Small | `llama3.2:3b` | npc + classify + guide |
| `threshold-mini-dev` | Medium | `qwen2.5-coder:1.5b` (instruct, not `-base`) | compiler (patches + suggests) |

Then in Engine **SETUP / AGENTS**: Small → `threshold-mini-npc`, Medium → `threshold-mini-dev` → **SAVE TIERS**.

## Datasets

| Path | Role |
|------|------|
| `datasets/small/classify.jsonl` | Intent router (`INTENT:` / `API:`) |
| `datasets/small/npc.jsonl` | In-character NPC + coaches |
| `datasets/small/guide.jsonl` | Short coach Q&A / API facts |
| `datasets/medium/compiler.jsonl` | **Canonical** medium set (patches + suggests) |
| `datasets/medium/planning.jsonl` | `production_plan` 11-step pipeline (pre-codegen) |
| `datasets/medium/performance.jsonl` | HILOD/WebP/Lite poly + sequential Ollama patterns |
| `datasets/medium/critical.jsonl` | Render-mode + API signature priority few-shots |
| `datasets/medium/patches.jsonl` | Split view — patches only (review) |
| `datasets/medium/suggests.jsonl` | Split view — suggests only (review) |
| `datasets/large/scenes.jsonl` | Full scene IIFEs (large models) |
| `datasets/raw/` | Imports from Compiler EXPORT TRAINING PAIR |

### Seed / grow

```bash
npm run bootcamp:seed              # full curated rewrite from scripts/bootcamp-seed.cjs
npm run bootcamp:seed -- --merge   # append missing user prompts only
```

Or edit JSONL by hand, then:

```bash
npm run bootcamp:build && npm run models:mini
```

### Grow from Compiler (UI)

1. SMART DEV → review output  
2. SETUP → **EXPORT TRAINING PAIR**  
3. Move `.json` → `datasets/raw/`  
4. `npm run bootcamp:import -- --file …`  
5. `npm run train:mini -- --no-seed`

## API truth (teach this)

```js
// positional — NOT object form
World.createObject(type, name, colorHex, usePhysics)
// types: 'cube' | 'sphere' | 'cone' | 'torus'
```

Always prefer extend-only IIFEs with pause guard + `Engine.setRenderMode(4)` unless the user asked for retro.

## Optional large models

```bash
npm run models:large -- --yes   # multi-GB download
```

## Related

- [BOOTCAMP.md](../../docs/BOOTCAMP.md)  
- [MODEL_DISTRIBUTION.md](../../docs/MODEL_DISTRIBUTION.md)  
- [AGENT_ROUTING.md](../../docs/AGENT_ROUTING.md)  
