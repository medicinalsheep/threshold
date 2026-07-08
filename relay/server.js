/**
 * Threshold PeerJS relay — self-host or AWS free tier.
 * Clients set VITE_PEER_HOST to this server's public hostname.
 */
const express = require('express');
const { ExpressPeerServer } = require('peer');

const PORT = parseInt(process.env.PORT || '9000', 10);
const PATH = process.env.PEER_PATH || '/peerjs';

const app = express();

app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'threshold-relay', path: PATH });
});

const server = app.listen(PORT, () => {
    console.log(`Threshold relay listening on ${PORT}, peer path ${PATH}`);
    console.log(`Health: http://0.0.0.0:${PORT}/health`);
});

const peerServer = ExpressPeerServer(server, {
    path: PATH,
    allow_discovery: true,
    proxied: process.env.TRUST_PROXY === 'true',
});

app.use(PATH, peerServer);

peerServer.on('connection', (client) => {
    console.log('peer connected:', client.getId?.() || client);
});

peerServer.on('disconnect', (client) => {
    console.log('peer disconnected:', client.getId?.() || client);
});

function shutdown(signal) {
    console.log(`${signal} — closing relay`);
    peerServer.close?.();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));