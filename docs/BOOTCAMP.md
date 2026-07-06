# Threshold Training Bootcamp

**In-repo (GitHub):** `training/bootcamp/` — JSONL + Modelfiles only.  
**Local:** Ollama weights via `ollama pull` — never committed.

See [MODEL_DISTRIBUTION.md](MODEL_DISTRIBUTION.md) for the full GitHub vs local policy.

---

## Anyone with a GitHub clone

```bash
npm run bootcamp:build      # JSONL → Modelfiles
npm run models:mini         # threshold-mini-npc + threshold-mini-dev
npm run models:large -- --yes   # optional 7B/8B (multi-GB download)
```

**AGENTS tiers:** `threshold-mini-npc` (small) · `threshold-mini-dev` (medium)

---

## Optional fast path (local only, gitignored)

```json
// config/bootcamp.local.json
{ "root": "Z:/Threshold training bootcamp" }
```

Or `BOOTCAMP_ROOT` env var. Your ramdisk copy is never pushed to GitHub.

---

## Grow training data

1. Edit `training/bootcamp/datasets/**/*.jsonl`
2. `npm run bootcamp:build`
3. `npm run models:mini`

Import a Compiler pair:

```bash
npm run bootcamp:import -- --file training/bootcamp/datasets/raw/pair.json --tier medium
```