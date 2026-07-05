# THRESHOLD SUITE

A browser-based 3D creative workstation: retro shader render modes, physics sandbox, code compiler, and AI prompt tooling.

## Features

- **Engine** — Three.js + Cannon-ES sandbox with 5 render modes (Threshold, 1-Bit, Terminal, SMPTE, Hyper/Bloom)
- **Compiler** — Convert Three.js snippets to Threshold API; procedural generators included
- **PromptGen** — Build system prompts for AI scene generation
- **Mobile-friendly** — Touch orbit controls, responsive layout for phone/tablet
- **Two editions** — Public web build and Grok edition with xAI API login

## Quick Start

```bash
npm install
npm run dev          # Web edition
npm run dev:grok     # Grok edition (API key login)
```

Open `http://localhost:5173`

## Build

| Script | Purpose |
|--------|---------|
| `npm run build:pages` | Static site for GitHub Pages → `dist-pages/` |
| `npm run build:grok` | Grok edition with login → `dist-grok/` |
| `npm run preview:pages` | Preview Pages build locally |
| `npm run preview:grok` | Preview Grok build locally |

## GitHub Pages

1. Push this repo to GitHub
2. Enable **Settings → Pages → GitHub Actions**
3. The deploy workflow runs on push to `main`

Live URL: `https://<username>.github.io/<repo-name>/`

## Grok Edition

The Grok edition adds direct script generation via the xAI API. Users enter their [xAI API key](https://console.x.ai) at login. Keys are stored in `sessionStorage` only.

```bash
npm run build:grok
```

## Engine Controls

| Input | Action |
|-------|--------|
| WASD / QE | Fly camera |
| Mouse / Touch | Orbit |
| Right-click ground | Spawn object (physics) |
| Right-click object | Inspect / delete |
| Command bar | Run JS (`allow pasting` for long scripts) |

## License

MIT — see LICENSE file.