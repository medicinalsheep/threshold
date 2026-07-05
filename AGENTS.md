# Threshold Suite — Grok Build Project Rules

## Project Overview

Threshold is a browser-based 3D creative suite with three modules:
- **Engine** (`src/engine/main.js`) — Three.js + Cannon-ES sandbox with retro shader render modes
- **Compiler** (`src/compiler/main.js`) — Transpiles Three.js snippets to Threshold API
- **Prompter** (`src/prompter/main.js`) — Generates AI prompts; Grok edition calls xAI API

## Tech Stack

- Vanilla JS (ES modules), no framework
- Vite (rolldown-vite) for bundling
- Three.js r182, cannon-es
- CSS variables for theming (`src/css/main.css`)

## Build Editions

| Command | Edition | Output |
|---------|---------|--------|
| `npm run dev` | web | local dev |
| `npm run dev:grok` | grok (API login) | local dev |
| `npm run build:pages` | web | `dist-pages/` for GitHub Pages |
| `npm run build:grok` | grok | `dist-grok/` for hosted Grok edition |

Edition is controlled by `VITE_EDITION` in `.env*` files. Version lives in `src/config.js`.

## Conventions

- Keep modules in `src/<module>/main.js` with `init<Module>()` exports
- Expose Engine APIs on `window` for command-bar scripting
- Use CSS variables, not hardcoded colors
- Prefer `navigator.clipboard` via `src/utils/clipboard.js`
- Do not add TypeScript or a framework unless explicitly requested
- Match existing monospace / panel UI aesthetic

## Key Globals (Engine)

`World`, `State`, `Engine`, `THREE`, `AudioSys`, `Physics`, `Utils`, `GLTFLoader`

## Testing

```bash
npm run build:pages
npm run build:grok
npm run preview:pages
```