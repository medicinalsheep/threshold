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

## Roadmap (Trellis / Veo class)

| Phase | Goal |
|-------|------|
| **Now** | Mini JSONL + Modelfile agents; realistic PBR game code |
| **Next** | Expand datasets from Compiler exports; bootcamp CI builds Modelfiles only |
| **Later** | Large downloadable scene/video models; tiered CDN/HF — manifest on GitHub, weights off-repo |
| **North star** | On-device quality approaching Trellis 2 (3D) + Veo 2 (video) with Lite/Mobile/Ultra graphics tiers |

Related: [BOOTCAMP.md](BOOTCAMP.md) · [AGENT_ROUTING.md](AGENT_ROUTING.md)