import { AssetBundle } from './assetBundle.js';
import { GltfImport } from './gltfImport.js';
import { ViewPrefs } from './viewPrefs.js';

const EDITION_MANIFEST_URL = 'reference/editions/threshold-ref-lite/manifest.json';

let cachedManifest = null;

export async function loadEditionManifest() {
    if (cachedManifest) return cachedManifest;
    const url = `${import.meta.env.BASE_URL || '/'}${EDITION_MANIFEST_URL}`.replace(/\/+/g, '/').replace(':/', '://');
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        cachedManifest = await res.json();
        return cachedManifest;
    } catch {
        return null;
    }
}

export async function spawnReferenceLiteScene() {
    const manifest = await loadEditionManifest();
    if (!manifest?.models?.length) {
        console.warn('[reference] Edition manifest not found — run npm run reference:fetch && reference:sync');
        return { spawned: 0, error: 'manifest missing' };
    }

    let spawned = 0;
    for (const model of manifest.models) {
        const rel = model.file.replace(/^import\//, '');
        const url = AssetBundle.getUrl(`import/${rel}`);
        const sp = model.spawn || {};
        try {
            await GltfImport.insertAtCursor({
                url,
                name: model.name,
                usePhysics: !!sp.physics,
                pos: sp.x != null ? { x: sp.x, y: sp.y ?? 0, z: sp.z ?? 0 } : null,
                meta: {
                    type: 'gltf',
                    gltfPath: model.file,
                    gltfUrl: url,
                    referenceEdition: manifest.id,
                    referenceKind: model.kind,
                    license: model.license,
                    author: model.author,
                },
            });
            spawned += 1;
        } catch (err) {
            console.warn(`[reference] Failed to spawn ${model.name}:`, err);
        }
    }
    if (spawned) {
        window.UI?.status?.(`Reference Lite: ${spawned} CC0 asset(s) loaded — try EXPORT → SCENE`);
    }
    return { spawned, edition: manifest.id };
}

export function shouldLoadReferenceLite() {
    return !!ViewPrefs.get('loadReferenceLite', false);
}

export function setLoadReferenceLite(on) {
    ViewPrefs.set('loadReferenceLite', !!on);
}

export async function bootstrapReferenceIfRequested() {
    if (!shouldLoadReferenceLite()) return null;
    ViewPrefs.set('loadReferenceLite', false);
    return spawnReferenceLiteScene();
}

window.ReferenceEdition = {
    loadEditionManifest,
    spawnReferenceLiteScene,
    shouldLoadReferenceLite,
    setLoadReferenceLite,
    bootstrapReferenceIfRequested,
};