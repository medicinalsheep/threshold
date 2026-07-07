# Threshold Training Bootcamp

**In-repo (GitHub):** `training/bootcamp/` — JSONL + Modelfiles only.  
**Local:** Ollama weights via `ollama pull` — never committed.

See [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) for the full GitHub vs local policy.

---

## Anyone with a GitHub clone

```bash
npm run bootcamp:build      # JSONL → Modelfiles
npm run models:mini         # threshold-mini-npc + threshold-mini-dev (canonical)
npm run models:large -- --yes   # optional 7B/8B (multi-GB download)
```

Then in Engine: **SETUP** tab → set Small to `threshold-mini-npc`, Medium to `threshold-mini-dev` → **SAVE TIERS**.

| Model | Tier | Base pull |
|-------|------|-----------|
| `threshold-mini-npc` | Small | `llama3.2:3b` |
| `threshold-mini-dev` | Medium | `qwen2.5-coder:1.5b-base` |
| `threshold-dev` | Large | `qwen2.5-coder:7b` |
| `threshold-large-scenes` | Large | `llama3.1:8b` |

`bootcamp:create` is deprecated — it runs `models:mini` (add `--large` for `models:large`).

---

## Optional fast path (local only, gitignored)

```json
// config/bootcamp.local.json
{ "root": "Z:/Threshold training bootcamp" }
```

Or `BOOTCAMP_ROOT` env var. Your ramdisk copy is never pushed to GitHub. Default path is `./training/bootcamp` inside the clone.

---

## Grow training data

1. Edit `training/bootcamp/datasets/**/*.jsonl`
2. `npm run bootcamp:build`
3. `npm run models:mini`

### Grow from Compiler sessions (UI)

1. **SMART DEV: SUGGEST** — review output in Compiler
2. **SETUP → EXPORT TRAINING PAIR** — downloads `.json` + `.jsonl`
3. Move `.json` to `training/bootcamp/datasets/raw/`
4. Import + rebuild:

```bash
npm run bootcamp:import -- --file training/bootcamp/datasets/raw/threshold-training-pair-….json
npm run bootcamp:build && npm run models:mini
```

Optional: enable **Queue pair on SMART APPLY**, then **EXPORT QUEUE** for batch `.jsonl`.

### Import CLI (also stdin / flags)

```bash
npm run bootcamp:import -- --file training/bootcamp/datasets/raw/pair.json
npm run bootcamp:import -- --input "// draft" --output "(function(){ ... })();"
npm run bootcamp:import -- --file batch.jsonl
cat pair.json | npm run bootcamp:import -- --stdin
```

Re-rank after changes:

```bash
npm run ollama:benchmark
```

---

## Related

- [AGENT_ROUTING.md](AGENT_ROUTING.md) — tiered router + provider rules
- [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — full dev path