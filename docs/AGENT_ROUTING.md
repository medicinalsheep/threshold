# Agent routing & model tiers (v9.16)

Threshold routes **tasks** to **small / medium / large** models — fast local LLMs for chat and patches, Grok or 7B/8B Ollama for full scene scripts.

---

## Task tiers

| Tier | Tasks | Preferred Ollama models | Tokens |
|------|-------|-------------------------|--------|
| **small** | NPC chat, intent classify | `threshold-mini-npc`, `llama3.2:3b`, `gemma3:4b` | 128 |
| **medium** | Compiler patch, dev suggest | `threshold-mini-dev`, `qwen2.5-coder:7b` | 1024 |
| **large** | PromptGen, full scene IIFE | Grok (if key) or `threshold-dev`, `threshold-large-scenes`, `llama3.1:8b` | 2048 |

Config: `config/agent-tasks.json` · Registry: `config/models-registry.json` · Probes: `config/agent-benchmark.json`

Copy `.env.local.example` → `.env.local` for `VITE_OLLAMA_URL` and optional `VITE_OLLAMA_TIER_SMALL|MEDIUM|LARGE`.

---

## Prompt engineering

Each task uses a **tight system prompt** in `src/shared/agentPrompts.js`:

- **Small** — brief scene slice (`getSceneContextBrief`), 1–3 sentence replies
- **Medium** — scene + sound context, “minimal diff” for patches; realistic PBR default
- **Large** — full scene context, IIFE-only output, no `World.clearWorld()`; retro shaders only when user asks

The router (`AgentRouter.runTask`) picks provider + model, logs last 20 routes to `localStorage`.

---

## UI

**SCENE dock → AI tab** (panel header: **AGENTS**)

- Tier dropdowns: Small / Medium / Large (`auto` = first installed model from config list)
- **SAVE TIERS** — persists to `ViewPrefs`
- **RUN BENCHMARK** — in-browser workflow probes (5 tasks)
- **SMART DEV** — `dev_suggest` via router (medium tier)
- **RUN AGENT (tiered)** — PromptGen large tier
- **GROK DEV** / **OLLAMA DEV** — force provider (skip tier auto-pick)

---

## Ollama & model files

| What | On GitHub? | Where |
|------|------------|--------|
| JSONL + Modelfiles | Yes | `training/bootcamp/` |
| GGUF weights | **No** | `~/.ollama/models` after `ollama pull` |
| API keys | **No** | `.env.local` (gitignored) |
| Ollama API | — | `http://127.0.0.1:11434` on your machine |

See [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md).

---

## Install mini models (canonical)

```bash
npm run bootcamp:build
npm run models:mini
```

Creates:

| Model | Base (download) | Tier |
|-------|-----------------|------|
| `threshold-mini-npc` | `llama3.2:3b` (~2 GB) | Small |
| `threshold-mini-dev` | `qwen2.5-coder:1.5b-base` (~1 GB) | Medium |

Optional large models (multi-GB):

```bash
npm run models:large -- --yes
```

→ `threshold-dev` (7B) · `threshold-large-scenes` (8B)

`bootcamp:create` is a **deprecated alias** for `models:mini` (add `--large` for `models:large`).

---

## Benchmark installed models

```bash
ollama serve
npm run ollama:benchmark
```

- Tests each tier’s preferred models against workflow probes
- Writes `dist-store/ollama-benchmark.json` with suggested tier defaults
- In-browser **RUN BENCHMARK** stores results in `ViewPrefs`; auto-applies tiers when all are `auto`, or use **APPLY SUGGESTED TIERS**

Quick smoke:

```bash
npm run ollama:verify
```

---

## Grow training data

1. Edit `training/bootcamp/datasets/**/*.jsonl`
2. `npm run bootcamp:build`
3. `npm run models:mini`

Import a Compiler pair (UI: **EXPORT TRAINING PAIR** in AI tab, or CLI):

```bash
npm run bootcamp:import -- --file training/bootcamp/datasets/raw/pair.json
npm run bootcamp:import -- --input "// draft" --output "(function(){ ... })();"
```

Optional ramdisk (local only, gitignored): `config/bootcamp.local.json` — see [BOOTCAMP.md](BOOTCAMP.md).

Threshold APIs to include in training examples: `World.createObject`, `PlayerController.spawnPlayer`, `Runtime.execute`, GIMP watch workflow (textures are **not** LLM-edited).

---

## Provider rules

| Condition | Behavior |
|-----------|----------|
| Small/medium task | Ollama first |
| Ollama offline + medium | Grok fallback (if key) |
| Large + xAI key + prefer Grok | Grok |
| Large, no key | Best installed 7B/8B Ollama |
| Explicit **GROK DEV** button | Forces Grok medium |
| Explicit **OLLAMA DEV** | Forces selected Ollama model |

Grok keys are **per browser tab** — not shared from x.ai login elsewhere.

---

## Related

- [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — full dev path
- [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) — GitHub vs local policy
- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) — GIMP / Blender (not LLM)