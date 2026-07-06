# Threshold Training Bootcamp

**Ramdisk lab:** `Z:\Threshold training bootcamp`  
**Engine repo:** `E:\threshold\threshold` (JWCOM-4 network share)

Use the ramdisk for fast dataset + modelfile work. Ollama still runs locally (`127.0.0.1:11434`); model weights live in `%USERPROFILE%\.ollama\models`.

---

## Pipeline

```powershell
Set-Location E:\threshold\threshold
npm.cmd run bootcamp:init      # link config, ensure folders
npm.cmd run bootcamp:build     # JSONL → Modelfiles on Z:
npm.cmd run bootcamp:create    # ollama create threshold-small|medium|large
npm.cmd run ollama:benchmark   # compare vs stock models
```

---

## Models

| Ollama name | Tier | Base | Dataset |
|-------------|------|------|---------|
| `threshold-small` | small | llama3.2:3b | NPC + classify JSONL |
| `threshold-medium` | medium | qwen2.5-coder:7b | Compiler patches |
| `threshold-large` | large | llama3.1:8b | Scene IIFEs |

After create: **AGENTS** → tier dropdowns → `threshold-small` / `threshold-medium` / `threshold-large` → **SAVE TIERS**.

---

## Add training data

1. Edit JSONL on **Z:** (fast) — `datasets/small|medium|large/*.jsonl`
2. Or drop pairs in `datasets/raw/` and import:

```powershell
npm.cmd run bootcamp:import -- --file "Z:\Threshold training bootcamp\datasets\raw\my-pair.json" --tier medium
```

3. Rebuild + recreate:

```powershell
npm.cmd run bootcamp:build
npm.cmd run bootcamp:create -- --medium   # single tier
```

---

## JSONL format

```json
{"task":"dev_suggest","messages":[{"role":"user","content":"..."},{"role":"assistant","content":"(function(){ ... })();"}]}
```

Pull ideas from `src/shared/promptCookbook.js` and `referenceLibrary.js` in the engine repo.

---

## Advanced: LoRA fine-tune

1. Export JSONL as Alpaca/ShareGPT from bootcamp datasets
2. Fine-tune `qwen2.5-coder:7b` (Unsloth / MLX / llama.cpp)
3. Convert to GGUF → `ollama create` with `FROM ./your-lora.gguf`
4. Store GGUF in `Z:\Threshold training bootcamp\builds\`

Modelfile template: `config/threshold-dev.Modelfile` in engine repo.

---

## Related

- [AGENT_ROUTING.md](AGENT_ROUTING.md) — tier router in Engine
- [STREAMLINED_DEV.md](STREAMLINED_DEV.md) — dev workflow
- `Z:\Threshold training bootcamp\README.md` — on-disk bootcamp guide