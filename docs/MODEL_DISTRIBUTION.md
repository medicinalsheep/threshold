# Model distribution — what is on GitHub vs local

## On GitHub (public repo)

| Asset | Size | Purpose |
|-------|------|---------|
| `training/bootcamp/datasets/*.jsonl` | KB | Training examples |
| `training/bootcamp/modelfiles/*.Modelfile` | KB | Ollama recipes (FROM + SYSTEM + MESSAGE) |
| `config/models-registry.json` | KB | Mini vs large model catalog |
| `config/threshold-dev.Modelfile` | KB | Single-model template |
| `scripts/models-mini.cjs` | — | Install mini agents |

**Not committed:** GGUF weights, LoRA binaries, API keys, personal paths, benchmark outputs with machine data.

## Local only (gitignored)

| Asset | Location |
|-------|----------|
| Ollama weights | `%USERPROFILE%\.ollama\models` |
| `.env.local` | xAI key, tier overrides, `BOOTCAMP_ROOT` |
| `config/bootcamp.local.json` | Ramdisk path override |
| `dist-store/ollama-benchmark.json` | Machine-specific rankings |

## Mini models (GitHub + `ollama pull`)

Anyone who clones the repo:

```bash
npm run bootcamp:build
npm run models:mini
```

Creates:

| Model | Base (download) | Tier |
|-------|-----------------|------|
| `threshold-mini-npc` | `llama3.2:3b` (~2 GB) | Small |
| `threshold-mini-dev` | `qwen2.5-coder:1.5b-base` (~1 GB) | Medium |

Modelfile deltas are tiny — bases come from Ollama's registry, not your GitHub.

## Large models (download required)

```bash
npm run bootcamp:build
npm run models:large -- --yes
```

| Model | Base | Size |
|-------|------|------|
| `threshold-dev` | `qwen2.5-coder:7b` | ~4.7 GB |
| `threshold-large-scenes` | `llama3.1:8b` | ~4.9 GB |

## No local drive coupling

- Default bootcamp path: `./training/bootcamp` (inside clone)
- Optional ramdisk: `config/bootcamp.local.json` — **never pushed**
- Engine works from any path; Ollama always `127.0.0.1:11434` on the machine running `ollama serve`

## Local laptop benchmark (RTX 2060 class)

```bash
# All installed models × workflow probes (NPC, intent, patch, suggest, scene)
npm run ollama:benchmark -- --all
# Optional: --ctx 4096 (default) · --only llama3.2:3B,qwen2.5:latest
```

Writes machine-local `dist-store/ollama-benchmark.json` (gitignored).

### Reference results (2026-07-10 · 2060 laptop · num_ctx 4096)

| Model | Fit | Avg latency | tok/s | Notes |
|-------|-----|-------------|-------|--------|
| **llama3.2:3B** | ✅ 100% | ~9.6 s | ~70 | **Best default** — NPC, intent, patches, scenes |
| **qwen2.5:latest** (~7B) | ✅ 100% | ~27 s | ~15 | Strong JS; use for large when you can wait |
| **gemma4:latest** (~8B / 9.6 GB) | ✅ 100% | ~41 s | ~40 | Quality OK; cold load slow — not interactive |
| **qwen3:4b** | ❌ 14% | ~19 s | ~59 | Thinking model; CoT eats budget — poor for code agents |

**Recommended tier picks on this class of GPU** (also in `config/agent-tasks.json` → `laptop2060Defaults`):

| Tier | Model |
|------|--------|
| small | `llama3.2:3B` |
| medium | `llama3.2:3B` (or `qwen2.5:latest` for harder patches) |
| large | `qwen2.5:latest` (Grok preferred when online) |

Client notes (`src/shared/ollamaClient.js`):

- Default `num_ctx` = 4096 (`VITE_OLLAMA_NUM_CTX` to override)
- Thinking models get `think: false` + CoT strip so Compiler/intent stay usable

## Training dataset growth

Bootcamp JSONL (intent / NPC / compiler / scenes) is the main on-device improvement lever. Expand via real Compiler exports and `npm run bootcamp:build` after edits.

| Dataset | Role |
|---------|------|
| `small/classify.jsonl` | Intent router |
| `small/npc.jsonl` | NPC chat |
| `medium/compiler.jsonl` | Patches / suggests |
| `large/scenes.jsonl` | Full IIFE scenes |

## Roadmap (Trellis / Veo class)

| Phase | Goal |
|-------|------|
| **Now** | Mini JSONL + Modelfile agents; realistic PBR game code; local Ollama tier picks |
| **Next** | Expand datasets from Compiler exports; bootcamp CI builds Modelfiles only |
| **Later** | Large downloadable scene/video models; tiered CDN/HF — manifest on GitHub, weights off-repo |
| **North star** | On-device quality approaching Trellis 2 (3D) + Veo 2 (video) with Lite/Mobile/Ultra graphics tiers |

Related: [BOOTCAMP.md](BOOTCAMP.md) · [AGENT_ROUTING.md](AGENT_ROUTING.md)