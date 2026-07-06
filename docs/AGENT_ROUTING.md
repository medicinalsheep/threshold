# Agent routing & model tiers (v9.13)

Threshold routes **tasks** to **small / medium / large** models — fast local LLMs for chat and patches, Grok or 8B+ Ollama for full scene scripts.

---

## Task tiers

| Tier | Tasks | Default models | Tokens |
|------|-------|----------------|--------|
| **small** | NPC chat, intent classify | `llama3.2:3b`, `gemma3:4b` | 128 |
| **medium** | Compiler patch, dev suggest | `qwen2.5-coder:7b` | 1024 |
| **large** | PromptGen, full scene IIFE | Grok (if key) or `llama3.1:8b` | 2048 |

Config: `config/agent-tasks.json` · Probes: `config/agent-benchmark.json`

---

## Prompt engineering

Each task uses a **tight system prompt** in `src/shared/agentPrompts.js`:

- **Small** — brief scene slice (`getSceneContextBrief`), 1–3 sentence replies
- **Medium** — scene + sound context, “minimal diff” for patches
- **Large** — full scene context, IIFE-only output, no `World.clearWorld()`

The router (`AgentRouter.runTask`) picks provider + model, logs last 20 routes to `localStorage`.

---

## UI

**SCENE → AGENTS**

- Tier dropdowns: Small / Medium / Large (`auto` = benchmark order from config)
- **SAVE TIERS** — persists to `ViewPrefs`
- **RUN BENCHMARK** — in-browser workflow probes (5 tasks)
- **SMART DEV** — `dev_suggest` via router (medium tier)
- **RUN AGENT (tiered)** — PromptGen large tier

---

## Ollama location (network repo vs local LLM)

| What | Where |
|------|--------|
| Threshold repo | May be on a network drive (e.g. `E:` → `\\192.168.1.11\D`) — **npm/build can be slow** |
| Ollama API | **Always local:** `http://127.0.0.1:11434` on the PC running `ollama serve` |
| Ollama install | `%LOCALAPPDATA%\Programs\Ollama\ollama.exe` |
| Model files | `%USERPROFILE%\.ollama\models` |

Copy `.env.local.example` → `.env.local` (gitignored) and set `VITE_OLLAMA_URL` if Ollama listens elsewhere.

---

## Benchmark installed models

```bash
ollama serve
npm run ollama:benchmark
```

- Tests each tier’s preferred models against workflow probes
- Writes `dist-store/ollama-benchmark.json`
- Prints ranked table + suggested tier defaults

Quick smoke:

```bash
npm run ollama:verify
```

---

## Custom / trained models

### Training Bootcamp (recommended)

```bash
npm run bootcamp:init && npm run bootcamp:build && npm run bootcamp:create
```

Ramdisk: `Z:\Threshold training bootcamp` — see [BOOTCAMP.md](BOOTCAMP.md).

Creates `threshold-small`, `threshold-medium`, `threshold-large`. Set AGENTS tiers → **SAVE TIERS**.

### Modelfile (single model)

```bash
ollama create threshold-dev -f config/threshold-dev.Modelfile
```

### Fine-tuning path (your data)

1. Export Compiler I/O and scene scripts from your projects
2. Format as `MESSAGE user` / `MESSAGE assistant` pairs in the Modelfile
3. Or use external LoRA on `qwen2.5-coder:7b` and import weights into Ollama
4. Re-run `npm run ollama:benchmark` to compare against stock models

Threshold APIs to include in training examples: `World.createObject`, `PlayerController.spawnPlayer`, `Runtime.execute`, GIMP watch workflow (textures are **not** LLM-edited).

---

## Provider rules

| Condition | Behavior |
|-----------|----------|
| Small/medium task | Ollama first |
| Ollama offline + medium | Grok fallback (if key) |
| Large + xAI key + prefer Grok | Grok |
| Large, no key | Best installed 8B/7B Ollama |
| Explicit **GROK DEV** button | Forces Grok medium |
| Explicit **OLLAMA DEV** | Forces selected Ollama model |

Grok keys are **per browser tab** — not shared from x.ai login elsewhere.

---

## Related

- [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — full dev path
- [CREATIVE_WORKFLOW.md](CREATIVE_WORKFLOW.md) — GIMP / Blender (not LLM)