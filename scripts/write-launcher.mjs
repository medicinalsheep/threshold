import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(readFileSync(join(root, 'deploy.config.json'), 'utf8'));
const pagesUrl = config.pagesUrl.replace(/\/$/, '');

const built = readFileSync(join(root, 'dist-pages', 'index.html'), 'utf8');
const launcher = built
    .replace(/href="\/threshold\//g, `href="${pagesUrl}/`)
    .replace(/src="\/threshold\//g, `src="${pagesUrl}/`)
    .replace(/href="\/vite\.svg"/g, `href="${pagesUrl}/vite.svg"`);

mkdirSync(join(root, 'local'), { recursive: true });
writeFileSync(join(root, 'local', 'index.html'), launcher);
console.log(`Launcher written → local/index.html (CDN: ${pagesUrl})`);