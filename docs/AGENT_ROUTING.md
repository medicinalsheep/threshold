# Agent routing & model tiers (v10.8)

Threshold routes **tasks** to **small / medium / large** models — fast local LLMs for chat and patches, Grok or 7B/8B Ollama for full scene scripts.

**UI:** Agent Portal on ENTER + **SETUP** tab in scene dock (not a separate AI tab).

See [UI_AND_AGENTS.md](UI_AND_AGENTS.md) for freeze, working folder, and sequential queue.

---

## Task tiers

| Tier | Tasks | Preferred Ollama models | Tokens |
|------|-------|-------------------------|--------|
| **small** | NPC chat, intent classify | `threshold-mini-npc`, `llama3.2:3b`, `gemma3:4b` | 128 |
| **medium** | Compiler patch, dev suggest | `threshold-mini-dev`, `qwen2.5-coder:7b` | 1024 |
| **large** | PromptGen, full scene IIFE | Grok (if key) or `threshold-dev`, `threshold-large-scenes`, `llama3.1:8b` | 2048 |

Config: `config/agent-tasks.json` · Registry: `config/models-registry.json` · Probes: `config/agent-benchmark.json`

Copy `.env.local.example` → `.env.local` for `VITE_OLLAMA_URL` and optional tier overrides.

---

## Prompt engineering

Each task uses a **tight system prompt** in `src/shared/agentPrompts.js`:

- **Small** — brief scene slice (`getSceneContextBrief`), 1–3 sentence replies
- **Medium** — scene + sound context, minimal diff for patches; realistic PBR default
- **Large** — full scene context, IIFE-only output, no `World.clearWorld()`; retro shaders only when user asks

The router (`AgentRouter.runTask`) picks provider + model, logs last 20 routes to `localStorage`.

---

## UI

**Agent Portal** (on ENTER) + **SETUP** tab (scene dock bottom-right → SCENE menu)

- Tier dropdowns: Small / Medium / Large (`auto` = first installed model from config list)
- **SAVE TIERS** — persists to `ViewPrefs`
- **RUN BENCHMARK** — in-browser workflow probes
- **SMART DEV** — `dev_suggest` via router (medium tier)
- **Sequential local runs** — default one Ollama model at a time (`ollamaRunQueue.js`)
- **Working folder** — scope what stays loaded during local inference
- **AI memory freeze** — automatic screen snapshot + asset park during local runs
- Status chips: Grok, Ollama, watch, textures, GPU renderer

For GitHub Pages: run `npm run ollama:serve` (CORS proxy) — not plain `ollama serve`.

---

## Ollama & model files

| What | On GitHub? | Where |
|------|------------|--------|
| JSONL + Modelfiles | Yes | `training/bootcamp/` |
| GGUF weights | **No** | `~/.ollama/models` after `ollama pull` |
| API keys | **No** | `sessionStorage` per tab (gitignored `.env.local` for dev) |
| Ollama API | — | `http://127.0.0.1:11434` on your machine |

Guests on Pages **cannot** use the host's Ollama — each browser talks to its own localhost.

See [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md).

---

## Install mini models

```bash
npm run bootcamp:build
npm run models:mini
```

| Model | Base (download) | Tier |
|-------|-----------------|------|
| `threshold-mini-npc` | `llama3.2:3b` (~2 GB) | Small |
| `threshold-mini-dev` | `qwen2.5-coder:1.5b-base` (~1 GB) | Medium |

Optional large models:

```bash
npm run models:large -- --yes
```

---

## Benchmark installed models

```bash
npm run ollama:serve    # if using Pages-style origin
npm run ollama:benchmark
```

Quick smoke: `npm run ollama:verify`

---

## Grow training data

1. Edit `training/bootcamp/datasets/**/*.jsonl`
2. `npm run bootcamp:build`
3. `npm run models:mini`

Import a Compiler pair (SETUP **EXPORT TRAINING PAIR** or CLI):

```bash
npm run bootcamp:import -- --file training/bootcamp/datasets/raw/pair.json
```

See [BOOTCAMP.md](BOOTCAMP.md).

---

## Provider rules

| Condition | Behavior |
|-----------|----------|
| Small/medium task | Ollama first |
| Ollama offline + medium | Grok fallback (if key) |
| Large + xAI key + prefer Grok | Grok |
| Large, no key | Best installed 7B/8B Ollama |
| Explicit **GROK DEV** | Forces Grok medium |
| Explicit **OLLAMA DEV** | Forces selected Ollama model |

Grok keys are **per browser tab** — not shared from x.ai login elsewhere.

---

## Related

- [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — full dev path
- [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) — GitHub vs local policy
- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) — GIMP / Blender (not LLM)