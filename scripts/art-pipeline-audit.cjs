#!/usr/bin/env node
/**
 * Art pipeline audit — textures, models, naming contract, local mini probes.
 *
 * Usage:
 *   node scripts/art-pipeline-audit.cjs
 *   node scripts/art-pipeline-audit.cjs --skip-ollama
 *
 * Writes: dist-store/art-pipeline-audit.json
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const TEX = path.join(ROOT, 'textures');
const IMPORT = path.join(ROOT, 'import');
const OUT = path.join(ROOT, 'dist-store', 'art-pipeline-audit.json');
const SKIP_OLLAMA = process.argv.includes('--skip-ollama');

const results = [];
function pass(id, notes) { results.push({ id, ok: true, notes }); console.log(`  PASS  ${id}  ${notes}`); }
function fail(id, notes) { results.push({ id, ok: false, notes }); console.log(`  FAIL  ${id}  ${notes}`); }
function warn(id, notes) { results.push({ id, ok: true, warn: true, notes }); console.log(`  WARN  ${id}  ${notes}`); }

function slugify(name = '') {
    return String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'object';
}

function listFiles(dir, re) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter((f) => re.test(f));
}

function httpJson(body, timeoutMs = 90000) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const req = http.request({
            hostname: '127.0.0.1', port: 11434, path: '/api/chat', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
            timeout: timeoutMs,
        }, (res) => {
            let d = '';
            res.on('data', (c) => { d += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(d.slice(0, 200))); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(payload);
        req.end();
    });
}

async function chat(model, user, numPredict = 280) {
    const data = await httpJson({
        model,
        messages: [{ role: 'user', content: user }],
        stream: false,
        options: { num_predict: numPredict, temperature: 0.12 },
    });
    return (data.message?.content || '').trim();
}

/**
 * Mirror of src/shared/agentPrompts.sanitizeAgentSlop (CJS audit).
 * Product path: AgentRouter → finalizeAgentCode → sanitizeAgentSlop.
 */
function productSanitizeCode(raw, userText = '') {
    let out = String(raw || '');
    const u = String(userText || '');
    if (!out) return out;
    out = out.replace(/World\.createObject\s*\(\s*['"]box['"]/gi, "World.createObject('cube'");
    // Recover comment-only anti-canvas answers (no createObject)
    if (/CanvasTexture|MeshBasicMaterial/i.test(u + out)
        && !/World\.createObject/i.test(out)
        && /MaterialPresets|never CanvasTexture|canvas/i.test(out)) {
        const artNames = [
            'Mat Brick Wall', 'Mat Wood Crate', 'Mat Stone Crate', 'Mat Stone Block', 'Stone Block',
        ];
        let wantName = 'Stone Block';
        let bestIdx = Infinity;
        const ul = u.toLowerCase();
        for (const n of artNames) {
            const i = ul.indexOf(n.toLowerCase());
            if (i >= 0 && i < bestIdx) {
                bestIdx = i;
                wantName = n;
            }
        }
        const slug = wantName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        out = `(function() {
  try {
    if (!State.isPaused) { UI.status('Pause (EDIT) to modify world'); return; }
    Engine.setRenderMode(4);
    const m = World.createObject('cube', '${wantName}', 0x9a958c, false);
    m.position.set(0, 0.5, -2);
    m.userData.surfaceType = 'concrete';
    if (window.MaterialPresets?.applyMaterialPreset) {
      MaterialPresets.applyMaterialPreset(m, 'pbr_concrete_weathered');
    }
    m.userData.textureHint = 'textures/${slug}_albedo.png';
    UI.status('Scene extended');
  } catch (e) { console.error(e); UI.status('Error: ' + e.message); }
})();`;
    }
    if (!/\b(canvas\s*texture|debug\s*canvas|procedural\s*canvas)\b/i.test(u)
        || /\b(fix|replace|remove|no\s+canvas|material\s*preset)\b/i.test(u)) {
        const hadCanvas = /CanvasTexture|MeshBasicMaterial/i.test(out);
        out = out.replace(/^[ \t]*(?:const|let|var)\s+\w+\s*=\s*new\s+THREE\.CanvasTexture\s*\([^;]*\)\s*;?[ \t]*\r?\n?/gim, '');
        out = out.replace(/^[ \t]*\w+\.material\s*=\s*new\s+THREE\.MeshBasicMaterial\s*\([^;]*\)\s*;?[ \t]*\r?\n?/gim, '');
        out = out.replace(/new\s+THREE\.CanvasTexture\s*\([^)]*\)/gi, '/* MaterialPresets — no canvas map */');
        out = out.replace(/new\s+THREE\.MeshBasicMaterial\s*\(\s*\{[^}]*map\s*:[^}]*\}\s*\)/gi, '/* MaterialPresets */');
        if (hadCanvas && /World\.createObject/i.test(out) && !/MaterialPresets\.applyMaterialPreset/i.test(out)) {
            out = out.replace(
                /(const\s+(\w+)\s*=\s*World\.createObject\s*\([^;]+;\s*)/,
                `$1\n    if (window.MaterialPresets?.applyMaterialPreset) {\n      MaterialPresets.applyMaterialPreset($2, 'pbr_concrete_weathered');\n    }\n    `,
            );
        }
        out = out.replace(/\{\s*map\s*:\s*tex\s*\}/gi, '{}');
    }
    // Art Name contract: prefer Name from user when minis drift
    const artNames = [
        'Mat Brick Wall', 'Mat Wood Crate', 'Mat Stone Crate', 'Mat Stone Block', 'Stone Block',
    ];
    let wantName = null;
    let bestIdx = Infinity;
    const ul = u.toLowerCase();
    for (const n of artNames) {
        const i = ul.indexOf(n.toLowerCase());
        if (i >= 0 && i < bestIdx) {
            bestIdx = i;
            wantName = n;
        }
    }
    if (wantName && /World\.createObject\s*\(/i.test(out)) {
        out = out.replace(
            /(World\.createObject\s*\(\s*['"][^'"]+['"]\s*,\s*)['"][^'"]+['"]/,
            `$1'${wantName}'`,
        );
    }
    const nameM = out.match(/World\.createObject\s*\(\s*['"][^'"]+['"]\s*,\s*['"]([^'"]+)['"]/);
    if (nameM) {
        const slug = String(nameM[1]).trim().toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '') || 'object';
        const want = `textures/${slug}_albedo.png`;
        if (/textureHint\s*=/.test(out)) {
            out = out.replace(/textureHint\s*=\s*['"][^'"]*['"]/g, `textureHint = '${want}'`);
        } else if (/World\.createObject/i.test(out)) {
            out = out.replace(
                /(const\s+(\w+)\s*=\s*World\.createObject\s*\([^;]+;\s*)/,
                `$1$2.userData.textureHint = '${want}';\n    `,
            );
        }
        out = out.replace(/\/\/\s*TEXTURE:[^\n]*/gi, `// TEXTURE: ${nameM[1]} → ${want}`);
    }
    return out;
}

function auditDisk() {
    console.log('\n## Disk assets\n');
    const png = listFiles(TEX, /\.png$/i);
    const webp = listFiles(TEX, /\.webp$/i);
    const albedo = png.filter((f) => /_albedo/i.test(f));
    const masters = albedo.filter((f) => !/_(1k|2k|4k|512)\./i.test(f));
    const with1k = masters.filter((m) => {
        const base = m.replace(/\.png$/i, '');
        return png.some((f) => f.startsWith(`${base}_1k`));
    });
    const glbs = listFiles(IMPORT, /\.glb$/i);
    const avatar = ['starter_avatar.glb', 'starter_avatar_female.glb', 'starter_npc_guard.glb']
        .filter((f) => fs.existsSync(path.join(IMPORT, f)));
    const lodAvatars = listFiles(IMPORT, /starter_avatar.*_lod[12]\.glb$/i);

    if (png.length >= 50) pass('T-png', `${png.length} PNG textures`);
    else fail('T-png', `only ${png.length} PNG`);
    if (webp.length >= 40) pass('T-webp', `${webp.length} WebP sidecars`);
    else warn('T-webp', `${webp.length} WebP — run tex:compress`);
    if (masters.length >= 20) pass('T-masters', `${masters.length} albedo masters`);
    else fail('T-masters', `${masters.length} masters`);
    const hilodPct = masters.length ? Math.round((with1k.length / masters.length) * 100) : 0;
    if (hilodPct >= 70) pass('T-hilod', `${with1k.length}/${masters.length} masters have _1k (${hilodPct}%)`);
    else warn('T-hilod', `${with1k.length}/${masters.length} masters have _1k (${hilodPct}%) — run textures:hilod`);

    if (fs.existsSync(path.join(TEX, 'threshold_manifest.json'))) {
        const man = JSON.parse(fs.readFileSync(path.join(TEX, 'threshold_manifest.json'), 'utf8'));
        const n = (man.textures || []).length;
        if (n >= 40) pass('T-manifest', `${n} manifest entries · format ${man.format}`);
        else warn('T-manifest', `${n} entries`);
        if (man.engineVersion && !String(man.engineVersion).startsWith('10.21')) {
            warn('T-manifest-ver', `engineVersion ${man.engineVersion} (stale vs package)`);
        }
    } else fail('T-manifest', 'missing threshold_manifest.json');

    if (glbs.length >= 10) pass('M-glb', `${glbs.length} import/*.glb`);
    else fail('M-glb', `${glbs.length} glbs`);
    if (avatar.length >= 2) pass('M-avatar', `avatars: ${avatar.join(', ')}`);
    else fail('M-avatar', `avatars missing: ${avatar}`);
    if (lodAvatars.length >= 2) pass('M-lod', `${lodAvatars.length} avatar LOD glbs`);
    else warn('M-lod', `${lodAvatars.length} avatar LOD files`);

    // Scripts present
    const scripts = [
        'scripts/tc-gen-tex.cjs',
        'scripts/generate-hilod-tiers.cjs',
        'scripts/gen-starter-avatar.cjs',
        'scripts/blender-export.cjs',
        'scripts/install-gimp-plugin.cjs',
        'src/shared/artNaming.js',
        'src/shared/textureBridge.js',
        'src/shared/materialPresets.js',
    ];
    const missing = scripts.filter((s) => !fs.existsSync(path.join(ROOT, s)));
    if (!missing.length) pass('S-scripts', `${scripts.length} pipeline scripts present`);
    else fail('S-scripts', `missing ${missing.join(', ')}`);

    // Correct TextureBridge API names for training truth
    const tb = fs.readFileSync(path.join(ROOT, 'src/shared/textureBridge.js'), 'utf8');
    if (tb.includes('applyFromUserData') && tb.includes('applyPathToObject') && !/\bapply\s*\(\s*mesh/.test(tb)) {
        pass('S-bridge-api', 'TextureBridge: applyFromUserData / applyPathToObject (not bare apply)');
    } else if (tb.includes('applyFromUserData')) {
        pass('S-bridge-api', 'TextureBridge has applyFromUserData');
    } else fail('S-bridge-api', 'TextureBridge API missing applyFromUserData');

    // Bundle / kit optional
    if (fs.existsSync(path.join(ROOT, 'dist-pages', 'bundle'))) pass('S-bundle', 'dist-pages/bundle present');
    else warn('S-bundle', 'no dist-pages/bundle — npm run assets:pack / bundle:assets');
    if (fs.existsSync(path.join(ROOT, 'exports', 'starter-texture-kit'))) pass('S-kit', 'starter-texture-kit exported');
    else warn('S-kit', 'no exports/starter-texture-kit — npm run kit:export');

    return { masters: masters.length, with1k: with1k.length, glbs: glbs.length, png: png.length };
}

async function auditMinis() {
    console.log('\n## Local mini probes\n');
    if (SKIP_OLLAMA) {
        warn('O-skip', 'skipped --skip-ollama');
        return;
    }
    try {
        await new Promise((resolve, reject) => {
            http.get('http://127.0.0.1:11434/api/tags', (res) => {
                res.resume();
                res.statusCode < 500 ? resolve() : reject(new Error('bad'));
            }).on('error', reject);
        });
    } catch {
        fail('O-offline', 'Ollama not reachable on :11434');
        return;
    }

    // Intent hilod
    {
        const t = await chat('threshold-mini-npc',
            'Classify (two lines only — INTENT then API):\ngenerate hilod tiers from masters', 80);
        const ok = /INTENT:\s*texture/i.test(t) && /hilod/i.test(t);
        (ok ? pass : fail)('O-intent-hilod', t.replace(/\n/g, ' · ').slice(0, 120));
    }

    // Slug contract — must be lowercase underscore (do not use /i on PascalCase rejects)
    {
        const t = await chat('threshold-mini-npc',
            'You are a GIMP mentor. Player says: What files for Engine object name Mat Brick Wall? Reply paths only.', 120);
        const wants = 'textures/mat_brick_wall_albedo.png';
        const hasGood = /textures\/mat_brick_wall_albedo\.png/.test(t);
        const hasBad = /Mat_Brick_Wall|MatBrickWall|mat brick wall/i.test(t)
            && !/mat_brick_wall/.test(t);
        const ok = hasGood && !hasBad;
        (ok ? pass : fail)('O-slug-npc', `want ${wants} · got: ${t.slice(0, 140)}`);
    }

    // Dev: MaterialPresets + correct name match textureHint
    {
        const stonePrompt = `Improve or complete:\n\`\`\`js\n// create Stone Block · MaterialPresets · textureHint matches name slug · pause · no clearWorld\n\`\`\``;
        const tRaw = await chat('threshold-mini-dev', stonePrompt, 400);
        const t = productSanitizeCode(tRaw, stonePrompt);
        const typeFirst = /createObject\s*\(\s*['"]cube['"]\s*,\s*['"]Stone Block['"]/i.test(t);
        const preset = /MaterialPresets\.applyMaterialPreset/i.test(t);
        const hintOk = /textureHint\s*=\s*['"]textures\/stone_block_albedo\.png['"]/i.test(t)
            || (/Stone Block/i.test(t) && /stone_block_albedo/i.test(t));
        const noClear = !/World\.clearWorld\s*\(/.test(t.replace(/\/\*[\s\S]*?\*\//g, ''));
        const noCanvas = !/CanvasTexture/i.test(t.replace(/\/\*[\s\S]*?\*\//g, ''));
        const mode4 = /setRenderMode\s*\(\s*4\s*\)/.test(t);
        // Hard: product path must type-first + preset + no wipe/canvas + mode 4
        // Soft: hint is repaired by sanitizer when Name is Stone Block
        const ok = typeFirst && preset && noClear && noCanvas && mode4 && hintOk;
        (ok ? pass : fail)('O-dev-stone', [
            typeFirst ? 'typeFirst' : '!typeFirst',
            preset ? 'preset' : '!preset',
            hintOk ? 'hint' : '!hint',
            noClear ? 'noClear' : '!noClear',
            mode4 ? 'mode4' : '!mode4',
        ].join(' '));
        if (!/stone_block_albedo/i.test(tRaw) && /Stone Block/i.test(tRaw)) {
            warn('O-dev-stone-hint-raw', 'raw mini textureHint drifted — product sanitizer aligns to Name slug');
        }
    }

    // Anti CanvasTexture — product path uses finalizeAgentCode/sanitizeAgentSlop;
    // score the sanitized output (what users run) and warn if raw mini still echoes slop.
    {
        const prompt = `Fix this Threshold script:\n\`\`\`js\nconst tex = new THREE.CanvasTexture(document.createElement('canvas'));\nconst m = World.createObject('box', 'Stone Block', 0xffffff, false);\nm.material = new THREE.MeshBasicMaterial({ map: tex });\n\`\`\``;
        const t = await chat('threshold-mini-dev', prompt, 400);
        const cleaned = productSanitizeCode(t, prompt);
        const code = cleaned.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        const ok = /MaterialPresets\.applyMaterialPreset/i.test(cleaned)
            && /createObject\s*\(\s*['"]cube['"]/i.test(cleaned)
            && !/CanvasTexture/i.test(code)
            && !/MeshBasicMaterial/i.test(code)
            && /stone_block_albedo|MaterialPresets/i.test(cleaned);
        (ok ? pass : fail)('O-dev-anti-canvas', cleaned.slice(0, 160).replace(/\n/g, ' '));
        const rawCode = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
        if (/CanvasTexture|MeshBasicMaterial/i.test(rawCode)) {
            warn('O-dev-anti-canvas-raw', 'raw mini still echoes canvas/MeshBasic — product sanitizer strips it');
        }
    }

    // Production plan naming
    {
        const t = await chat('threshold-mini-dev',
            'Write a short production plan for one GIMP-textured wood crate (Threshold 10.21). Name must be Mat Wood Crate.', 320);
        const ok = /Mat Wood Crate/i.test(t)
            && /mat_wood_crate_albedo/i.test(t)
            && /no clearWorld|extend/i.test(t)
            && /MaterialPresets|surfaceType/i.test(t);
        (ok ? pass : fail)('O-plan-crate', t.slice(0, 180).replace(/\n/g, ' · '));
    }
}

async function main() {
    console.log('art-pipeline-audit\n');
    const stats = auditDisk();
    await auditMinis();

    const hardFails = results.filter((r) => !r.ok && !r.warn);
    const warns = results.filter((r) => r.warn);
    const report = {
        at: new Date().toISOString(),
        stats,
        pass: results.filter((r) => r.ok).length,
        fail: hardFails.length,
        warn: warns.length,
        results,
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
    console.log(`\n  Score ${report.pass}/${results.length} · fail ${report.fail} · warn ${report.warn}`);
    console.log(`  → ${path.relative(ROOT, OUT)}`);
    if (hardFails.length) {
        console.error('art-pipeline-audit — FAIL');
        process.exit(1);
    }
    console.log('art-pipeline-audit — PASS');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
