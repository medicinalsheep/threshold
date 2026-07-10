# Threshold Bridge (Chrome extension)

Local **Threshold mini** (Ollama) → optional paste into **your open Grok tab**.

This is **your** automation on **your** machine:

1. Mini model runs via `127.0.0.1` Ollama (e.g. `threshold-mini-mobile`)
2. You click **Send to Grok tab →**
3. Extension fills the chat box on an open Grok page (or opens `grok.x.ai`)

It does **not** steal X/Grok cookies for free API access. Grok still uses **your** logged-in browser session when you send.

## Install (unpacked)

1. Chrome → `chrome://extensions` → **Developer mode** ON  
2. **Load unpacked** → select this folder:  
   `extension/threshold-chrome`
3. Pin the extension

## Prerequisites

```bash
ollama serve
ollama pull medicinalsheep/threshold-mini-mobile
# or from repo: npm run models:mobile
```

Optional: `npm run ollama:serve` if you also use Pages + proxy on `:11435` (extension tries both).

## Use

1. Open popup → **Ping Ollama** (chip should say Ollama ✓)  
2. Type prompt / paste code → **Run mini**  
3. Open or focus [grok.x.ai](https://grok.x.ai) (log in yourself)  
4. **Send to Grok tab →** — text lands in the composer; you hit send in Grok  

Right-click selection → **Threshold mini: improve selection** / **send to Grok tab**.

## Icons

If icons are missing, copy from repo `icons/`:

```bash
# from repo root (Windows PowerShell)
Copy-Item icons/favicon-32.png extension/threshold-chrome/icons/icon32.png
Copy-Item icons/icon-192.png extension/threshold-chrome/icons/icon128.png
# scale 16/48 as needed or reuse 32
```

## Privacy

- Ollama calls stay on localhost  
- Grok inject only when you click send  
- No Threshold server receives your prompts  
