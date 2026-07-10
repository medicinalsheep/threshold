#!/usr/bin/env node
/**
 * Local CORS + Private-Network-Access proxy for Ollama.
 *
 * Why: GitHub Pages (HTTPS public site) → http://127.0.0.1:11434 is blocked by
 * modern Chrome without Access-Control-Allow-Private-Network. Stock Ollama does
 * not always send that header, so the Agent Portal looks "offline" even when
 * `ollama list` works in a terminal.
 *
 * Listens: http://127.0.0.1:11435  →  http://127.0.0.1:11434
 * Usage:   node scripts/ollama-cors-proxy.cjs
 *          npm run ollama:serve   (starts this + ensures Ollama is up)
 */
const http = require('http');
const { URL } = require('url');

const LISTEN_HOST = process.env.THRESHOLD_OLLAMA_PROXY_HOST || '127.0.0.1';
const LISTEN_PORT = Number(process.env.THRESHOLD_OLLAMA_PROXY_PORT || 11435);
const UPSTREAM = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

function corsHeaders(req) {
    const origin = req.headers.origin || '*';
    return {
        'Access-Control-Allow-Origin': origin === 'null' ? '*' : origin,
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS',
        'Access-Control-Allow-Headers': req.headers['access-control-request-headers']
            || 'Authorization,Content-Type,User-Agent,Accept,X-Requested-With',
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
}

function proxy(req, res) {
    const target = new URL(req.url || '/', UPSTREAM);
    const headers = { ...req.headers, host: target.host };
    delete headers['origin'];

    const opts = {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || 11434,
        path: target.pathname + target.search,
        method: req.method,
        headers,
        timeout: 600000,
    };

    const upstream = http.request(opts, (upRes) => {
        const outHeaders = {
            ...upRes.headers,
            ...corsHeaders(req),
        };
        // Node may set transfer-encoding; avoid double-length issues
        delete outHeaders['content-length'];
        res.writeHead(upRes.statusCode || 502, outHeaders);
        upRes.pipe(res);
    });

    upstream.on('error', (err) => {
        const body = JSON.stringify({
            error: 'Ollama upstream unreachable',
            detail: err.message,
            hint: 'Start Ollama (ollama serve) on port 11434, then keep this proxy running.',
            upstream: UPSTREAM,
        });
        res.writeHead(502, {
            'Content-Type': 'application/json',
            ...corsHeaders(req),
        });
        res.end(body);
    });

    req.pipe(upstream);
}

const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(req));
        res.end();
        return;
    }
    proxy(req, res);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`[ollama-cors-proxy] port ${LISTEN_PORT} already in use — proxy may already be running.`);
        process.exit(0);
    }
    console.error('[ollama-cors-proxy]', err);
    process.exit(1);
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
    console.log(`[ollama-cors-proxy] ${LISTEN_HOST}:${LISTEN_PORT} → ${UPSTREAM}`);
    console.log('[ollama-cors-proxy] Agent Portal (GitHub Pages) should use this port for Ollama.');
    console.log('[ollama-cors-proxy] CORS + Access-Control-Allow-Private-Network enabled.');
});
