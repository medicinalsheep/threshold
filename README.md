# THRESHOLD

Collaborative 3D playground — host a session, build on a blank grid, invite friends, use AI and Compiler tools as you need them.

**Live:** https://medicinalsheep.github.io/threshold/ · **Version:** 10.0.0

---

## Quick start

| Goal | Steps |
|------|--------|
| **Host** | Lobby → name → **CREATE SESSION →** → share room link |
| **Join** | Open host link or enter room code → **JOIN** |
| **Offline** | Lobby → **Offline & options** → **OFFLINE →** |

You land on a **blank grid**. Right-click **INSERT** to add objects. The scene panel, Compiler, and PromptGen unlock as you build — nothing busy on first load.

**PLAY** runs physics · **BUILD** pauses to edit · collapse **SCENE** hides the whole dock (edge **SCENE** button restores it).

---

## Develop locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # dist-pages for GitHub Pages
```

Doc index: [docs/README.md](docs/README.md)

---

## Multiplayer

Host-authoritative sessions over **PeerJS (WebRTC)**. The host browser is the session authority — no dedicated game server.

| Role | World edit | Pause |
|------|------------|-------|
| Host | Yes (BUILD) | Yes |
| Guest | No | Synced from host |

Voice options (WebRTC / Discord hybrid) are in the lobby under Voice settings before CREATE.

---

## Plugins & export

GIMP/Blender plugins, export wizard, and store packaging scripts are still in the repo — see `docs/GETTING_STARTED.md` and `docs/EXPORT_WALKTHROUGH.md` when you need them. They are not part of the default first-run path.