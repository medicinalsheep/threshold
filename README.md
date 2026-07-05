# THRESHOLD SUITE

A collaborative 3D creative playground — design scenes, generate code, spawn characters, and play together in real time.

**Live:** https://medicinalsheep.github.io/threshold/

## Play with friends

1. **Open** the link above
2. **Create Session** — you become the host
3. **Copy Link** — send it to friends (adds `?room=YOURCODE` to the URL)
4. Friends **open the link** → tap **Join Friends**
5. Everyone builds together — inserts, code, and environment sync to all players

The host can **Pause** the scene. Guests send actions to the host; the host broadcasts the world state.

## Workflow

```
Lobby → Engine (design) ↔ Compiler (code) ↔ PromptGen (AI prompts)
         ↓
    Insert characters / players / custom code
         ↓
    Share session link → friends join → keep building
```

### Insert menu (+ button or right-click)

| Tab | Action |
|-----|--------|
| Character | Spawn a simple character |
| Player Key | Insert another player by key (+ import `.json`) |
| Saved | Use a saved player profile |
| Code | Run custom JavaScript |

### PromptGen

Enable **Include live scene + running code** to generate prompts based on what's currently in the world — objects, render mode, environment, session info.

### Compiler

- **RUN IN ENGINE** executes code for everyone (in a session, guests request → host runs → sync)
- **RUNNING CODE** panel shows live executed scripts

## Mobile

- Tap **+** to insert objects
- Tap **ENV** for environment panel
- Pinch/drag to orbit

## Solo

Tap **Solo Play** on the lobby screen to skip multiplayer.

## Develop locally

```bash
npm install
npm run dev
```

Push to `main` — GitHub Pages updates automatically.

## Tech

- Three.js + Cannon-ES physics
- PeerJS (WebRTC) for session sync — no backend server required
- Host-authoritative scene state

## License

MIT