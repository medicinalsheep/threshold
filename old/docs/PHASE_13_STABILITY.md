# Phase 13 — Stability & session UX

**Version:** 6.7.0 · **Status:** Shipped

Phase 13 makes the path from lobby → solo/host session → play reliable: fast audio on repeat visits, shared weather in multiplayer, and pointer/pause behavior that respects Alt+Tab and EDIT mode.

---

## 1. Starter sound import (manifest fingerprint)

### Problem

First session imported 50+ starter clips into IndexedDB sequentially. Repeat visits still walked the manifest and hit IndexedDB per clip. Concurrent `seedStarterSounds()` from `initEngine` and `bootstrapStarterScene` could double work.

### Solution

| Piece | Location | Behavior |
|-------|----------|----------|
| Fingerprint | `starterSfx.js` | Hash of `manifest.version`, format, and each clip's `id`, `bytes`, `oggBytes`, filenames |
| Storage key | `localStorage` | `threshold_starter_manifest_fp` |
| Fast path | `seedStarterSounds()` | If fingerprint matches **and** `SoundLibrary.hasAllClipIds()` → return `{ skipped: true, reason: 'manifest' }` |
| Yield | `seedStarterSounds()` | `await setTimeout(0)` every 4 imports on cold path |
| Dedup | `seedingPromise` | Concurrent callers share one in-flight promise |

### Verify

```bash
# First run — imports clips (watch console / status)
npm run dev
# Lobby → SOLO PLAY

# Second run — should log skipped manifest path; no long hitch
# Hard refresh, SOLO PLAY again — "Starter audio ready (cached)" status optional
```

Clear cache to force re-import:

```js
localStorage.removeItem('threshold_starter_manifest_fp');
// + clear IndexedDB threshold_sounds_v1 if needed
```

---

## 2. Staggered ambient bootstrap

### Problem

Wind + highway + birds + 3 rain layers could all call `decodeAudioData` in the same frame → main-thread freeze (especially combined with bird-loop bug fixed in 6.6.1).

### Solution

| Stage | Delay | Module |
|-------|-------|--------|
| Wind loop | 0 ms | `AmbientAudio.startStaggered()` |
| Highway loop | +420 ms | same |
| Recorded birds | +520 ms | `RecordedAmbient.start()` |
| Rain light | on weather start | `WeatherSystem._startRainLoops({ stagger: true })` |
| Rain heavy | +380–620 ms per layer | same |
| Weather auto-start | 3200 ms after ambient (solo) | `bootstrapStarterAmbience()` |

Entry points:

- **Solo / host starter scene:** `StarterAudio.ensureStarterAudio()`
- **Engine init:** `seedStarterSounds()` only (no ambient until scene loads)
- **Guest join:** `ensureStarterAudio({ deferWeather: true })` then `WeatherSystem.applyNetworkState()`

---

## 3. Multiplayer weather sync

### Authority model

| Role | Weather simulation |
|------|-------------------|
| **Host / solo** | Full tick: intensity drift, thunder/gust scheduling, rain volumes |
| **Guest / spectate** | No local drift; lerps to host `intensity` / `targetIntensity`; replays host thunder/gust events |

### Sync payload (`Sync.captureLive().weather`)

```json
{
  "active": true,
  "intensity": 0.47,
  "targetIntensity": 0.52,
  "events": [
    { "id": "abc123", "type": "thunder", "clipId": "starter_thunder_near_b", "vol": 0.41, "rate": 0.97 }
  ]
}
```

- Host drains `events` each `captureLive()` (max 12 queued).
- Guests dedupe by `event.id` (`_seenEventIds` set, cap 48).
- Host pushes live state every ~220 ms during active weather tick + on `setWeather()` / start / stop.

### Guest join mid-storm

1. `FULL_STATE` includes `weather` snapshot.
2. `ensureStarterAudio({ deferWeather: true })` seeds sounds + staggered ambient.
3. `applyNetworkState(weather, { smooth: false })` starts rain at host intensity immediately.

### API (unchanged for creators)

```js
World.setWeather({ intensity: 0.7 });
World.setWeather({ rain: false }); // stops + syncs
```

Host-only effect: guests receive via live sync; non-host calls are local-only today.

---

## 4. Pointer lock & pause edge cases

### Release pointer lock when

| Event | Handler |
|-------|---------|
| Tab away / minimize | `document.visibilitychange` → hidden |
| Alt+Tab / focus loss | `window.blur` |
| EDIT / PAUSE | `threshold:pause` + `UI.togglePause` + guest `applyLiveState` pause transition |
| Spectate view active | `Spectate.setActive(true)` |
| Spectate session | `_isWalkPlayLook()` returns false |
| Host camera follow | `_isWalkPlayLook()` returns false |

### No pointer lock when

- `Network.mode === 'spectate'`
- `Session.isSpectator`
- `State.isPaused` (EDIT)
- Spectate HUD following host cam

Walk look still works without lock via relative `pointermove` when lock unavailable.

---

## 5. Related hotfixes (6.6.1–6.6.2)

| Version | Fix |
|---------|-----|
| 6.6.1 | Bird loop `_birdStarting` guard; `dt` before `AmbientAudio.tick`; async loop handles |
| 6.6.2 | Windowed fullscreen; TPS behind player; lobby auto-immersive |

---

## 6. Files touched

| File | Role |
|------|------|
| `src/shared/starterSfx.js` | Fingerprint, yield import |
| `src/shared/starterAudio.js` | Bootstrap orchestration |
| `src/shared/soundLibrary.js` | `hasAllClipIds`, `countClipIds` |
| `src/shared/ambientAudio.js` | `startStaggered()` |
| `src/shared/weatherSystem.js` | Network capture/apply, staggered rain |
| `src/shared/sync.js` | `weather` in capture/apply |
| `src/shared/starterScene.js` | Uses `ensureStarterAudio` |
| `src/engine/main.js` | Pointer hardening, `starterAudio` import |
| `src/spectate/main.js` | Release lock on spectate enter |

---

## 7. Next phase

**Phase 14** — Ambient iteration 2b (river, power lines, fence rattle, dirt mound). See [AMBIENT_ASSETS_ROADMAP.md](AMBIENT_ASSETS_ROADMAP.md).