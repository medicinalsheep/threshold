# Auth: Grok / xAI only (optional)

**X OAuth was removed** — Threshold does not sign in with X, read X sessions, or post via X API.

Play works with **no accounts**. Cloud AI is optional BYO key.

---

## Grok / xAI API key

| | |
|--|--|
| **For** | Cloud agents, large scene generation |
| **How** | Paste key from [console.x.ai](https://console.x.ai) |
| **Code** | `src/auth/main.js` (`Auth`), `grokAuthUi.js`, `src/grok/client.js` |
| **Not** | SuperGrok browser tab cookies |

Lobby → **More options → Grok API**, nav **Grok**, or Agent Portal → save key. Optional “remember on this device.”

Models: `config/grok-models.json` (default **grok-4.5**).

---

## Display name

Custom lobby field only → multiplayer `Session.playerName` via `displayName.js`.

---

## Local AI (not “auth”)

Ollama on the user’s machine — `npm run ollama:serve` + minis. No API key.

Chrome extension **Threshold Bridge** can run minis and paste into an open Grok **tab** (user-driven automation) — see `extension/threshold-chrome/README.md`.

---

## Related

- [AGENT_ROUTING.md](AGENT_ROUTING.md) — Grok vs Ollama routing  
- [UI_AND_AGENTS.md](UI_AND_AGENTS.md) — portal / SETUP  
