# Multiplayer sessions (PeerJS)

**Version:** see `src/config.js` → `VERSION`

## Room codes

Format: `NAME4-KEY6-RAND4`  
Example: `MEDI-83FVY7-FCDU`

| Part | Meaning |
|------|---------|
| `MEDI` | Host display-name slug (4 chars) |
| `83FVY7` | Host player key |
| `FCDU` | Per-session entropy |

Normalize: trim, uppercase, no spaces (`normalizeRoomCode`).

Invite URL: `?room=MEDI-83FVY7-FCDU` on the same origin as the host (Pages vs localhost).

## Config (default = fine)

| Env | Default | Notes |
|-----|---------|--------|
| `VITE_PEER_HOST` | *(empty)* | Empty → **PeerJS public cloud** (`0.peerjs.com`) |
| `VITE_PEER_PORT` / `PATH` / `SECURE` | only if custom host | Must match **host and all guests** |
| `VITE_ICE_SERVERS` | browser defaults | Optional JSON STUN/TURN for hard NATs |

**No custom peer env is required** for GitHub Pages + friends on Pages.

### Misconfigurations that break join

1. **Host on localhost, guest on Pages** (or different custom `VITE_PEER_HOST`) → different signaling → “room not found”  
2. **Host closed tab / slept laptop** after CREATE → Peer ID gone  
3. **Host passcode set**, guest left blank → `Wrong passcode`  
4. **Typos** in room code (O vs 0, I vs 1 — we avoid 0/1/O/I in random segments; name slug can still contain letters from the display name)  
5. Corporate firewall blocking WebRTC / PeerJS cloud  
6. **Firefox Enhanced Tracking Protection** set to Strict — allow the site or use Standard if join fails (WebRTC/PeerJS)  
7. Guest and host on **different origins** (localhost vs Pages) — signaling never matches  

Firefox is supported; “Forget About This Site” only clears cache/storage (useful after deploys). See [GETTING_STARTED.md](GETTING_STARTED.md)#browsers.

## Host checklist

1. Lobby → **CREATE SESSION** (wait until share panel / “Host live”)  
2. Keep that browser tab **open** (do not close until done)  
3. Share code or invite link  
4. Optional passcode: More options before CREATE, or PLAYERS panel  
5. **ENTER SESSION** when ready to play (guests can often connect after CREATE even before enter)

## Guest checklist

1. Same site build as host when possible (`medicinalsheep.github.io/threshold/` ↔ same)  
2. Paste code → **JOIN** (or open invite link)  
3. If timed out: host still online? passcode? retry  

## Verify peer cloud (ops)

```bash
# Should return a random peer id (cloud signaling up)
curl -s https://0.peerjs.com/peerjs/id
```

Full browser join still needs WebRTC (cannot probe room membership from Node).

## Related

- `src/shared/network.js` — host/guest  
- `src/shared/roomCode.js` — code format  
- `src/lobby/main.js` — CREATE / JOIN UI  
