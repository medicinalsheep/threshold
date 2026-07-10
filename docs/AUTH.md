# Accounts: X + Grok (optional)

Threshold play works **without** either account. Accounts unlock identity / feed and cloud AI.

**Version:** see `src/config.js` → `VERSION`

---

## Two separate systems

| | **X (Twitter)** | **Grok (xAI)** |
|--|-----------------|----------------|
| **For** | Who you are — handle, avatar, feed, posts | AI generation (agents, large scenes) |
| **How** | OAuth 2.0 Authorization Code + PKCE | API key from [console.x.ai](https://console.x.ai) |
| **Code** | `src/auth/xAuth.js`, `xFeed.js` | `src/auth/main.js` (`Auth`), `grokAuthUi.js`, `src/grok/client.js` |
| **Config** | `VITE_X_CLIENT_ID` | Key pasted in UI (not in repo) |
| **Not** | SuperGrok / xAI API access | SuperGrok browser tab cookies |

You cannot “hijack” a SuperGrok tab session into this app (browser security). Same model family via official API keys only.

---

## X OAuth setup

1. Create an app at [developer.x.com](https://developer.x.com) → User authentication → **OAuth 2.0**
2. Type: **Single page App** (public client / PKCE)
3. Callback URLs (exact match):
   - `https://medicinalsheep.github.io/threshold/`
   - `http://localhost:5173/`
   - `http://127.0.0.1:5173/`
4. Copy **Client ID** → `.env.local` / GitHub Pages env:

```bash
VITE_X_CLIENT_ID=your_client_id
# optional:
# VITE_X_REDIRECT_URI=https://medicinalsheep.github.io/threshold/
```

5. App scopes used: `tweet.read` `tweet.write` `users.read` `offline.access`

After changing scopes on developer.x.com, users must **Sign out of X** then **Sign in with X** again (refresh tokens do not upgrade scopes). The feed UI prompts when `tweet.write` is missing.

Session storage key: `threshold_x_session_v2`.

---

## Grok / xAI API key

1. Create a key at [console.x.ai](https://console.x.ai)
2. Lobby **More options → Accounts → Connect Grok**, nav **Grok**, or Agent Portal
3. Optional **Remember on this device** → localStorage; otherwise tab `sessionStorage` only

Models: `config/grok-models.json` (default chat/code **grok-4.5**). TEST probe hits `api.x.ai`.

---

## Display name

Lobby name source:

| Source | Behavior |
|--------|----------|
| **Custom** | Free text (default) |
| **X @handle** | Requires X sign-in |
| **X name** | Requires X sign-in |

Resolved name → multiplayer `Session.playerName` via `src/auth/displayName.js`.

---

## Where UI lives

| Surface | X | Grok |
|---------|---|------|
| Lobby → More options → Accounts | Sign in / out | Connect / manage |
| App nav | Chip + 𝕏 feed menu + Sign in X | Grok chip → modal |
| Agent Portal | Connected status in detect list | Key + TEST + model |
| X feed panel | Feed + compose post | — |

---

## Security notes

- Never commit API keys or OAuth client **secrets** (SPA uses public Client ID only)
- Keys are not synced to multiplayer guests
- Ollama remains local-only (separate from Grok)

---

## Related

- [UI_AND_AGENTS.md](UI_AND_AGENTS.md) — lobby + portal
- [AGENT_ROUTING.md](AGENT_ROUTING.md) — when Grok vs Ollama is chosen
- [GETTING_STARTED.md](GETTING_STARTED.md) — first-run path
- [CHANGELOG.md](CHANGELOG.md) — 10.12.22–10.12.28 auth/session history
