#!/usr/bin/env node
/**
 * Start Ollama with CORS origins for Threshold (GitHub Pages + local dev).
 * Usage: node scripts/ollama-serve-threshold.cjs
 * Or:    npm run ollama:serve
 */
const { spawn } = require('child_process');

const origins = [
    'https://medicinalsheep.github.io',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    '*',
].join(',');

const env = { ...process.env, OLLAMA_ORIGINS: origins };

console.log('Starting ollama serve with Threshold CORS origins…');
console.log('OLLAMA_ORIGINS=', origins);

const child = spawn('ollama', ['serve'], {
    env,
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 0));