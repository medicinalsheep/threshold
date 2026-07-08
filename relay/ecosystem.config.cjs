/** PM2 config — AWS / VPS: pm2 start ecosystem.config.cjs */
module.exports = {
    apps: [{
        name: 'threshold-relay',
        script: 'server.js',
        cwd: __dirname,
        instances: 1,
        autorestart: true,
        max_memory_restart: '256M',
        env: {
            NODE_ENV: 'production',
            PORT: 9000,
            PEER_PATH: '/peerjs',
            TRUST_PROXY: 'true',
        },
    }],
};