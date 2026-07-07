/**
 * 10.11.1 — Prune threshold_manifest.json:
 * - Drop _512 HILOD variants
 * - Keep quality-first object names only (grid + TC + avatars)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const MAN_PATH = path.join(ROOT, 'textures', 'threshold_manifest.json');
const PUBLIC_MAN = path.join(ROOT, 'public', 'bundle', 'textures', 'threshold_manifest.json');

const KEEP_OBJECTS = new Set([
    'Starter Ground',
    'AI Build Station',
    'TC Runner',
    'TC Hauler',
    'TC Marshal',
    'TC Mechanic',
    'TC Span',
    'Avatar Skin Light',
    'Avatar Skin Medium',
    'Avatar Skin Deep',
    'Avatar Hair Alpha',
]);

function pruneManifest(manifest) {
    const before = manifest.textures.length;
    manifest.textures = manifest.textures
        .filter((entry) => KEEP_OBJECTS.has(entry.objectName))
        .map((entry) => {
            const variants = (entry.variants || []).filter((v) => !/_512/i.test(v.suffix || v.file || ''));
            const out = { ...entry, variants };
            if (/_512/i.test(out.file || '')) {
                const base = (out.file || '').replace(/_512(?=\.)/i, '');
                out.file = base;
                out.path = (out.path || '').replace(/_512(?=\.)/i, '');
            }
            return out;
        });
    manifest.engineVersion = '10.11.1';
    manifest.note = manifest.note || 'Quality-first manifest — min 1K HILOD; grid + TC + avatar slots only';
    const after = manifest.textures.length;
    return { manifest, before, after, kept: KEEP_OBJECTS.size };
}

function writeManifest(filePath, manifest) {
    fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

const raw = JSON.parse(fs.readFileSync(MAN_PATH, 'utf8'));
const { manifest, before, after } = pruneManifest(raw);
writeManifest(MAN_PATH, manifest);
if (fs.existsSync(path.dirname(PUBLIC_MAN))) {
    writeManifest(PUBLIC_MAN, manifest);
}

console.log(`prune-manifest: ${before} → ${after} entries (${KEEP_OBJECTS.size} object names kept)`);