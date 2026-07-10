# Model distribution — what is on GitHub vs local

## On GitHub (public repo)

| Asset | Size | Purpose |
|-------|------|---------|
| `training/bootcamp/datasets/**/*.jsonl` | KB–MB | Curated training examples |
| `training/bootcamp/modelfiles/*.Modelfile` | KB | Ollama recipes (`FROM` + `SYSTEM` + few-shot `MESSAGE`) |
| `training/bootcamp/config/bootcamp.json` | KB | Which datasets → which model |
| `config/models-registry.json` | KB | Mini / large / community catalog |
| `config/agent-tasks.json` | KB | Tier routes + `production_plan` task |
| `scripts/bootcamp-*.cjs`, `train-mini.cjs`, `models-mini.cjs` | — | Build & install |
| `scripts/ollama-golden.cjs` | — | Optional local regression for minis |

**Not committed:** GGUF/Ollama weights, API keys, personal paths, machine benchmark JSON, internal training notes.

## Local only (gitignored)

| Asset | Location |
|-------|----------|
| Ollama weights | `%USERPROFILE%\.ollama\models` (or `~/.ollama`) |
| `.env.local` | xAI key, tier overrides, `BOOTCAMP_ROOT` |
| `config/bootcamp.local.json` | Ramdisk / custom training root |
| `dist-store/ollama-*.json` | Benchmark / golden / stress machine reports |
| `docs/TRAINING_BACKLOG.md` | Maintainer-only backlog (if present locally) |

## Published on Ollama (namespace `medicinalsheep`)

Anyone with Ollama (no repo clone required for weights):

```bash
ollama pull medicinalsheep/threshold-mini-npc      # ~2 GB — intent + NPC
ollama pull medicinalsheep/threshold-mini-dev      # ~1 GB — patches / plans
ollama pull medicinalsheep/threshold-mini-mobile   # ~1.3 GB — 1B phone-friendly
```

| Model | Page |
|-------|------|
| NPC | https://ollama.com/medicinalsheep/threshold-mini-npc |
| Dev | https://ollama.com/medicinalsheep/threshold-mini-dev |
| Mobile | https://ollama.com/medicinalsheep/threshold-mini-mobile |

Re-publish after retraining (signed in as `medicinalsheep`):

```bash
npm run models:mini && npm run models:mobile
npm run models:publish -- --all
```

## Mini models (clone → pull base → create)

```bash
npm run bootcamp:build
npm run models:mini              # npc + dev
npm run models:mobile            # 1B mobile quality pack
# or: npm run train:mini -- --no-seed
```

| Model | Base (download) | Tier | Role |
|-------|-----------------|------|------|
| `threshold-mini-npc` | `llama3.2:3b` (~2 GB) | Small | Intent + NPC + coaches |
| `threshold-mini-dev` | `qwen2.5-coder:1.5b` (~1 GB) | Medium | Patches, plans, safety JS |
| `threshold-mini-mobile` | `llama3.2:1b` (~1.3 GB) | Small | Short intent/NPC for phones / low RAM |

Use the **instruct** `qwen2.5-coder:1.5b` tag (not `-base`) so `/api/chat` works.

Few-shot MESSAGE caps keep Modelfiles small; full JSONL stays on disk for rebuilds.

### Phones & “powerful” devices

| Device class | Practical choice |
|--------------|------------------|
| **Flagship phone** (8–16 GB RAM, recent SoC) | `threshold-mini-mobile` (1B) for chat/intent; **Grok** for full scene codegen |
| **Mid phone** | Short intent/NPC only; prefer cloud agents |
| **Desktop / laptop with Ollama** | `threshold-mini-npc` + `threshold-mini-dev` |
| **No Ollama** | Grok API key in Agent Portal |

1B is the quality/size sweet spot for on-device today. 3B NPC can run on some flagships but heat/battery suffer; full Compiler-quality still wants desktop or cloud.

## Large models (optional)

```bash
npm run models:large -- --yes
```

| Model | Base | Size |
|-------|------|------|
| `threshold-dev` | `qwen2.5-coder:7b` | ~4.7 GB |
| `threshold-large-scenes` | `llama3.1:8b` | ~4.9 GB |

## Local laptop tips (RTX 2060 class)

```bash
npm run ollama:benchmark -- --all   # workflow probes + tok/s
npm run ollama:golden               # mini regression (format, modes, safety)
```

Recommended interactive defaults: **small/medium** `llama3.2:3B` or `threshold-mini-*`; **large** `qwen2.5:latest` or Grok when online. See `config/agent-tasks.json` → `laptop2060Defaults`.

Client (`OllamaClient`): default `num_ctx` 4096; thinking models get `think: false` + CoT strip.

## Runtime quality guards

| Guard | Where |
|-------|--------|
| Intent two-line format + repairs | `agentPrompts` + `intentRouter` |
| Render mode map (realistic→4, terminal→2) | `sanitizeRenderModesInCode` |
| Anti-slop (`clearWorld`, `box`→`cube`, THREE.Scene) | `finalizeAgentCode` |
| Sequential Ollama + GLB parallel guard | `ollamaRunQueue` |

## Training growth

See [BOOTCAMP.md](BOOTCAMP.md). Compiler **EXPORT TRAINING PAIR** → `datasets/raw/` → `bootcamp:import` → `train:mini -- --no-seed`.

## Roadmap (Trellis / Veo class)

| Phase | Goal |
|-------|------|
| **Now** | Mini JSONL + Modelfile agents; production plan + HILOD-aware code |
| **Next** | More Compiler exports; optional CI golden on self-hosted Ollama |
| **Later** | Large scene/video models; weights off-repo |
| **North star** | On-device quality with Lite/Mobile/Ultra tiers |

Related: [BOOTCAMP.md](BOOTCAMP.md) · [AGENT_ROUTING.md](AGENT_ROUTING.md)
