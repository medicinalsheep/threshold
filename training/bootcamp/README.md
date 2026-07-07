# Threshold Training Bootcamp (in-repo)

**On GitHub:** JSONL examples + generated Modelfiles (text only, ~KB).  
**Not on GitHub:** Ollama weight files (GB), `.env.local`, `bootcamp.local.json`, your ramdisk copy.

## Quick start (any clone)

```bash
npm run bootcamp:build
npm run models:mini          # pulls small bases + creates threshold-mini-*
npm run models:large         # optional — prompts before 7B/8B download
```

Set AGENTS tiers to `threshold-mini-npc` / `threshold-mini-dev`.

## Optional ramdisk (local only)

Copy `config/bootcamp.local.example.json` → `config/bootcamp.local.json` (gitignored) with your fast path.

## Add examples

**In Engine:** SMART DEV → **EXPORT TRAINING PAIR** (SETUP tab) → move `.json` to `datasets/raw/` → `npm run bootcamp:import`

Or edit `datasets/**/*.jsonl` directly → `npm run bootcamp:build` → `npm run models:mini`