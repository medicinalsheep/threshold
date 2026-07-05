# THRESHOLD SUITE

A browser-based 3D creative workstation: retro shader render modes, physics sandbox, code compiler, and AI prompt tooling.

**Author:** [medicinalsheep](https://github.com/medicinalsheep) · **Contact:** jfkyt@icloud.com

Built with [Grok Build](https://x.ai/build) (beta).

## Features

- **Engine** — Three.js + Cannon-ES sandbox with 5 render modes (Threshold, 1-Bit, Terminal, SMPTE, Hyper/Bloom)
- **Compiler** — Convert Three.js snippets to Threshold API; procedural generators included
- **PromptGen** — Build system prompts for AI scene generation
- **Mobile-friendly** — Touch orbit controls, responsive layout for phone/tablet
- **Two editions** — Public web build and Grok edition with xAI API login

## Quick Start (Local)

```bash
npm install
npm run dev          # Web edition
npm run dev:grok     # Grok edition (API key login)
```

Open `http://localhost:5173`

## Build Targets

| Script | Purpose |
|--------|---------|
| `npm run build:pages` | Static site for GitHub Pages → `dist-pages/` |
| `npm run build:grok` | Grok edition with login → `dist-grok/` |
| `npm run preview:pages` | Preview Pages build locally |
| `npm run preview:grok` | Preview Grok build locally |

## Deploy to GitHub Pages (access anywhere)

1. Create a new GitHub repo (e.g. `threshold`)
2. Push this project:

```bash
git init
git add .
git commit -m "Threshold Suite v1.0"
git branch -M main
git remote add origin https://github.com/YOUR_USER/threshold.git
git push -u origin main
```

3. In repo **Settings → Pages**, set source to **GitHub Actions**
4. The included workflow deploys automatically on push to `main`
5. Your app will be live at `https://YOUR_USER.github.io/threshold/`

> If your repo name differs from `threshold`, update `VITE_BASE_PATH` in `.github/workflows/deploy-pages.yml` or it auto-uses the repo name.

### Phone / Tablet

- Add the Pages URL to your home screen (Safari: Share → Add to Home Screen)
- Use one-finger drag to orbit, pinch to zoom
- Right-click menu becomes long-press on touch devices (browser-dependent)

## Grok Edition (login required)

The Grok edition adds direct script generation via the xAI API.

```bash
npm run build:grok
# host dist-grok/ on any static host (Netlify, Vercel, etc.)
```

On launch, users enter their [xAI API key](https://console.x.ai). Keys are stored in `sessionStorage` only.

**Prompter workflow:**
1. Describe your scene
2. Click **GENERATE PROMPT** (or **RUN WITH GROK** when logged in)
3. Paste/run script in Engine command bar (`allow pasting` first for long scripts)

> **CORS note:** Browser calls to `api.x.ai` may be blocked on some hosts. If so, use `npm run dev:grok` locally or deploy behind a proxy. Set `VITE_XAI_API_URL` to your proxy endpoint if needed.

## Grok Build Development

This repo includes `AGENTS.md` for [Grok Build](https://x.ai/build) project rules. Open the folder in Grok Build:

```bash
cd threshold
grok
```

## Engine Controls

| Input | Action |
|-------|--------|
| WASD / QE | Fly camera |
| Mouse / Touch | Orbit |
| Right-click ground | Spawn object (physics) |
| Right-click object | Inspect / delete |
| Command bar | Run JS (`allow pasting` for long scripts) |

## Project Structure

```
src/
  engine/     # 3D sandbox
  compiler/   # Code transpiler + generators
  prompter/   # Prompt builder + Grok API
  auth/       # Grok edition login
  grok/       # xAI API client
  css/        # Styles + responsive
  config.js   # Version + edition flags
```

## License

MIT — see LICENSE file.