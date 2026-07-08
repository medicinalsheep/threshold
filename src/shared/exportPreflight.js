/** Sprint E — scan scene before export for missing assets */

import { SoundLibrary } from './soundLibrary.js';
import { TextureLibrary } from './textureLibrary.js';
import { collectContentInventory } from './exportWalkthrough.js';
import { assessSceneSlop } from './assetProductionPlan.js';

function normPath(p) {
    return String(p || '').replace(/\\/g, '/').toLowerCase();
}

export function runExportPreflight() {
    const State = window.State;
    const inventory = collectContentInventory();
    const objects = State?.objects || [];
    const sceneObjects = objects.filter((o) => !o.userData?.isPlayer);
    const errors = [];
    const warnings = [];
    const infos = [];

    if (sceneObjects.length < 1) {
        errors.push('Scene is empty — add objects or load a starter world before exporting.');
    }

    const mode = window.Network?.mode;
    if (mode === 'guest' || mode === 'spectate') {
        errors.push('Export from host or solo — guests cannot snapshot the shared world.');
    }

    const soundIds = new Set(SoundLibrary.list().map((s) => s.id));
    const texPaths = new Set(
        TextureLibrary.list().map((t) => normPath(t.sourcePath || t.name))
    );

    sceneObjects.forEach((o) => {
        const ud = o.userData || {};
        const label = ud.name || ud.id || 'Object';

        if (ud.soundClipId && !soundIds.has(ud.soundClipId)) {
            warnings.push(`Missing sound clip "${ud.soundClipId}" on ${label} — record in SFX or remove soundClipId.`);
        }

        if (ud.textureHint && !ud.textures) {
            const hint = normPath(ud.textureHint);
            const matched = [...texPaths].some((p) => hint.includes(p) || p.includes(hint.replace(/^textures\//, '')));
            if (!matched) {
                warnings.push(`Texture hint "${ud.textureHint}" on ${label} — not in Texture library (GIMP SYNC or bundle).`);
            }
        }

        if ((ud.type === 'gltf' || o.type === 'gltf') && !ud.gltfPath && !ud.gltfUrl) {
            warnings.push(`GLTF object "${label}" has no gltfPath — re-insert from Blender manifest.`);
        }
    });

    const running = window.Runtime?.runningCode || '';
    if (/World\.clearWorld/.test(running)) {
        warnings.push('Running code calls World.clearWorld() — export snapshot may not match play session.');
    }

    const lowTexObjects = sceneObjects.filter((o) => {
        if (!o.material) return false;
        const hilod = o.userData?.textureHilod?.activeBySlot?.albedo || '';
        return hilod === '_512' || (!o.userData?.textures?.albedo && !o.material.map);
    });
    if (lowTexObjects.length > 2) {
        warnings.push(`${lowTexObjects.length} object(s) lack 1K+ PBR maps — use GIMP SYNC or Blender GLB before ship.`);
    }

    assessSceneSlop(sceneObjects).forEach((w) => warnings.push(w));

    if (inventory.soundRefs?.length) {
        infos.push(`${inventory.soundRefs.length} sound clip(s) referenced — blobs stay local until bundle:assets / native pack.`);
    }
    if (inventory.textureRefs?.length) {
        infos.push(`${inventory.textureRefs.length} texture(s) in library — ship via npm run bundle:assets for standalone builds.`);
    }
    if (inventory.models?.length) {
        infos.push(`${inventory.models.length} GLB model(s) in scene — include import/ in export bundle.`);
    }

    const ok = errors.length === 0;
    const canProceed = errors.length === 0;

    return {
        ok,
        canProceed,
        errors,
        warnings,
        infos,
        stats: {
            objects: sceneObjects.length,
            sounds: inventory.soundRefs?.length || 0,
            textures: inventory.textureRefs?.length || 0,
            models: inventory.models?.length || 0,
            hilod: inventory.hilodGroups || 0,
            hasScripts: !!(running.trim() || inventory.scripts?.hasProject),
        },
        inventory,
    };
}

window.ExportPreflight = { runExportPreflight };