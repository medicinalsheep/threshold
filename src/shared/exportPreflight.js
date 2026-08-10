/** Sprint E — scan scene before export for missing assets */

import { SoundLibrary } from './soundLibrary.js';
import { TextureLibrary } from './textureLibrary.js';
import { collectContentInventory } from './exportWalkthrough.js';
import { assessSceneSlop } from './assetProductionPlan.js';
import { expectedTexturePath, expectedGlbPath, slugifyObjectName } from './artNaming.js';

function normPath(p) {
    return String(p || '').replace(/\\/g, '/').toLowerCase();
}

function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
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

    const artMissing = [];
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

        // Art naming contract: named mesh with no maps / no GLB path
        const name = String(ud.name || '').trim();
        if (name && o.material && !ud.gltfPath && !ud.gltfUrl) {
            const hasMap = !!(ud.textures?.albedo || o.material?.map);
            if (!hasMap) {
                artMissing.push({
                    name,
                    albedo: expectedTexturePath(name, 'albedo'),
                    glb: expectedGlbPath(name),
                    slug: slugifyObjectName(name),
                });
            }
        }
    });

    if (artMissing.length) {
        const show = artMissing.slice(0, 4);
        show.forEach((a) => {
            infos.push(`Art: "${a.name}" → ${a.albedo} or ${a.glb} (name must match GIMP/Blender)`);
        });
        if (artMissing.length > 4) {
            infos.push(`… +${artMissing.length - 4} more named props without maps`);
        }
    }

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
        artMissing,
        stats: {
            objects: sceneObjects.length,
            sounds: inventory.soundRefs?.length || 0,
            textures: inventory.textureRefs?.length || 0,
            models: inventory.models?.length || 0,
            hilod: inventory.hilodGroups || 0,
            hasScripts: !!(running.trim() || inventory.scripts?.hasProject),
            artMissing: artMissing.length,
        },
        inventory,
    };
}

/** Compact HTML for wizard SCENE / REVIEW panels (escaped). */
export function formatPreflightHtml(report, { maxWarn = 8, maxInfo = 6 } = {}) {
    if (!report) return '';
    const parts = [];
    if (report.errors?.length) {
        parts.push('<p class="insert-hint preflight-section preflight-err"><strong>Blockers</strong></p>');
        parts.push(`<ul class="export-wizard-summary">${report.errors.map((e) =>
            `<li class="export-warn-block">${escapeHtml(e)}</li>`).join('')}</ul>`);
    }
    if (report.warnings?.length) {
        const w = report.warnings.slice(0, maxWarn);
        parts.push('<p class="insert-hint preflight-section preflight-warn"><strong>Warnings</strong></p>');
        parts.push(`<ul class="export-wizard-summary">${w.map((e) =>
            `<li class="export-warn-soft">${escapeHtml(e)}</li>`).join('')}`
            + (report.warnings.length > maxWarn
                ? `<li class="export-warn-soft">… +${report.warnings.length - maxWarn} more</li>`
                : '')
            + '</ul>');
    }
    if (report.infos?.length) {
        const info = report.infos.slice(0, maxInfo);
        parts.push('<p class="insert-hint preflight-section"><strong>Notes</strong></p>');
        parts.push(`<ul class="export-wizard-summary">${info.map((e) =>
            `<li>${escapeHtml(e)}</li>`).join('')}`
            + (report.infos.length > maxInfo
                ? `<li>… +${report.infos.length - maxInfo} more</li>`
                : '')
            + '</ul>');
    }
    if (!parts.length) {
        parts.push('<p class="insert-hint export-wizard-ok">Preflight clean — scene ready for web export.</p>');
    }
    const s = report.stats || {};
    parts.push(
        `<p class="preflight-stats insert-hint">${s.objects ?? 0} objects · ${s.sounds ?? 0} sounds · `
        + `${s.textures ?? 0} textures · ${s.models ?? 0} models`
        + (s.artMissing ? ` · ${s.artMissing} art-name hint(s)` : '')
        + '</p>',
    );
    return parts.join('');
}

window.ExportPreflight = { runExportPreflight, formatPreflightHtml };