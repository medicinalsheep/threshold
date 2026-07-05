# Threshold Suite

Browser 3D sandbox with PeerJS multiplayer, Compiler, and PromptGen.

## Architecture

- `src/lobby/` — session create/join/solo
- `src/shared/network.js` — PeerJS host/guest sync
- `src/shared/sync.js` — scene capture/apply
- `src/shared/actions.js` — host-authoritative action dispatch
- `src/engine/main.js` — Three.js sandbox

## Commands

```bash
npm run dev
npm run build
```

Version: `src/config.js` → `VERSION`

## Rules

- Vanilla JS, no framework
- Multiplayer is host-authoritative via PeerJS
- Guests use `Actions.dispatch()` — never mutate scene directly as guest