# Threshold Relay Server

Self-hosted **PeerJS signaling** for Threshold multiplayer. Use when:

- Public PeerJS cloud is unreliable
- You want more control over sessions
- You're scaling toward AWS (free tier → paid)

## Local (dev / LAN)

```bash
cd relay
npm install
npm start
```

Health check: `http://localhost:9000/health`

Point your Threshold build at:

```env
VITE_PEER_HOST=localhost
VITE_PEER_PORT=9000
VITE_PEER_PATH=/peerjs
VITE_PEER_SECURE=false
```

Rebuild the web app after changing env.

## PM2 (production VPS)

```bash
cd relay
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

Set `TRUST_PROXY=true` when behind nginx (see `nginx.conf.example`).

## Docker

```bash
cd relay
docker build -t threshold-relay .
docker run -p 9000:9000 -e TRUST_PROXY=true threshold-relay
```

Health: `curl http://localhost:9000/health`

From repo root: `npm run relay:verify` (CI smoke test).

## AWS free tier (outline)

1. **EC2 t2.micro** or **Lightsail $3.50** — Ubuntu 22.04
2. Install Node 20, clone repo, `cd relay && npm install`
3. **PM2** or systemd: `node server.js`
4. **Nginx** reverse proxy + Let's Encrypt (HTTPS required for many browsers)
5. Security group: inbound 443 (and 9000 if testing direct)

```nginx
location /peerjs {
    proxy_pass http://127.0.0.1:9000/peerjs;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Production env:

```env
VITE_PEER_HOST=relay.yourdomain.com
VITE_PEER_PORT=443
VITE_PEER_PATH=/peerjs
VITE_PEER_SECURE=true
TRUST_PROXY=true
```

## TURN (optional, Phase 4)

For strict NAT, add **coturn** on the same VPS and set:

```env
VITE_ICE_SERVERS=[{"urls":"stun:relay.yourdomain.com:3478"},{"urls":"turn:relay.yourdomain.com:3478","username":"user","credential":"pass"}]
```

## Limits

- This is **signaling only** — game state stays host-authoritative in the browser
- Host must still run the session; relay does not replace the host
- Free tier: ~1–10 concurrent small sessions realistic; monitor CPU