/**
 * Starter material library helpers — catalog UI + example spawn + texture wire.
 * @see docs/MATERIALS.md
 */
import {
    MATERIAL_PRESETS,
    MATERIAL_CATEGORIES,
    applyMaterialPreset,
    getPresetById,
    listPresetsByCategory,
} from './materialPresets.js';
import { applyEntriesToMesh } from './starterTex.js';
import { AssetBundle } from './assetBundle.js';
import { TextureManifest } from './textureManifest.js';

const MAN = 'textures/threshold_manifest.json';

let _manifestCache = null;

async function loadManifest() {
    if (_manifestCache) return _manifestCache;
    try {
        const blob = await AssetBundle.fetchBlob(MAN, { retries: 2 });
        if (!blob) return null;
        _manifestCache = TextureManifest.parse(await blob.text());
        return _manifestCache;
    } catch {
        return null;
    }
}

export const MaterialLibrary = {
    list(category = 'all') {
        return listPresetsByCategory(category);
    },

    categories() {
        return MATERIAL_CATEGORIES;
    },

    get(id) {
        return getPresetById(id);
    },

    apply(mesh, presetId) {
        return applyMaterialPreset(mesh, presetId);
    },

    /**
     * Apply preset + optional starter maps from threshold_manifest (objectName match).
     */
    async applyWithMaps(mesh, presetId) {
        const preset = applyMaterialPreset(mesh, presetId);
        if (!preset || !mesh) return preset;
        const objectName = preset.textureObjectName || mesh.userData?.name;
        if (!objectName) return preset;
        mesh.userData.name = objectName;
        const TB = window.TextureBridge;
        if (!TB) return preset;
        const manifest = await loadManifest();
        if (!manifest) return preset;
        const entries = TextureManifest.entriesForObject(manifest, objectName);
        if (entries?.length) {
            await applyEntriesToMesh(mesh, entries, TB);
        }
        return preset;
    },

    /**
     * Place sample meshes — one per preset — for browsing materials.
     * Rows = categories; columns = presets in that category.
     * @param {{ category?: string, spacing?: number, rowSpacing?: number, startX?: number, z?: number, mappedOnly?: boolean }} [opts]
     */
    async spawnExamples(opts = {}) {
        const World = window.World;
        const State = window.State;
        if (!World?.createObject) {
            window.UI?.status?.('Material library: World not ready');
            return [];
        }
        if (State && !State.isPaused) {
            State.isPaused = true;
            window.UI?.updateSimMode?.();
            window.dispatchEvent(new CustomEvent('threshold:pause', {
                detail: { paused: true, reason: 'material-library' },
            }));
        }
        window.SurfaceProfile?.set?.('creator');

        const cats = opts.category && opts.category !== 'all'
            ? MATERIAL_CATEGORIES.filter((c) => c.id === opts.category)
            : MATERIAL_CATEGORIES;
        const spacing = opts.spacing ?? 1.55;
        const rowSpacing = opts.rowSpacing ?? 2.2;
        const baseZ = opts.z ?? -4;
        const spawned = [];

        for (let row = 0; row < cats.length; row += 1) {
            let list = listPresetsByCategory(cats[row].id);
            if (opts.mappedOnly) list = list.filter((p) => p.textureObjectName);
            if (!list.length) continue;
            const startX = opts.startX ?? -((list.length - 1) * spacing) / 2;
            const z = baseZ - row * rowSpacing;
            for (let i = 0; i < list.length; i += 1) {
                const p = list[i];
                const type = p.exampleMesh === 'torus' ? 'torus'
                    : p.exampleMesh === 'cone' ? 'cone'
                        : p.exampleMesh === 'cube' ? 'cube'
                            : 'sphere';
                const mesh = World.createObject(
                    type,
                    p.textureObjectName || `Mat ${p.label}`,
                    p.color ?? 0xcccccc,
                    false,
                );
                if (!mesh) continue;
                mesh.position.set(startX + i * spacing, 0.55, z);
                mesh.userData.locked = true;
                mesh.userData.isMaterialExample = true;
                mesh.userData.materialLibraryId = p.id;
                mesh.userData.materialCategory = cats[row].id;
                mesh.userData.polyBudget = 'low';
                await this.applyWithMaps(mesh, p.id);
                if (window.NegativeLod?.enableObject) {
                    window.NegativeLod.enableObject(mesh, { distance: 72, source: 'user' });
                }
                spawned.push(mesh);
            }
        }

        window.UI?.status?.(
            `Material library: ${spawned.length} examples · rows=categories · EDIT → Texture → Preset`,
        );
        return spawned;
    },

    /** Remove meshes tagged isMaterialExample */
    clearExamples() {
        const State = window.State;
        if (!State?.objects) return 0;
        const doomed = State.objects.filter((o) => o?.userData?.isMaterialExample);
        for (const o of doomed) {
            try {
                if (window.World?.deleteObject) window.World.deleteObject(o);
                else {
                    window.Engine?.scene?.remove?.(o);
                    State.objects = State.objects.filter((x) => x !== o);
                }
            } catch { /* ignore */ }
        }
        window.UI?.status?.(`Cleared ${doomed.length} material examples`);
        return doomed.length;
    },

    fillSelect(selectEl, selectedId = '') {
        if (!selectEl) return;
        const cats = MATERIAL_CATEGORIES;
        selectEl.innerHTML = '<option value="">— material preset —</option>';
        for (const cat of cats) {
            const group = document.createElement('optgroup');
            group.label = cat.label;
            for (const p of listPresetsByCategory(cat.id)) {
                const opt = document.createElement('option');
                opt.value = p.id;
                opt.textContent = p.label;
                if (p.id === selectedId) opt.selected = true;
                group.appendChild(opt);
            }
            selectEl.appendChild(group);
        }
    },

    initUi() {
        const sel = document.getElementById('insp-material-preset');
        if (sel && !sel.dataset.bound) {
            sel.dataset.bound = '1';
            this.fillSelect(sel);
            sel.addEventListener('change', async () => {
                const id = sel.value;
                const obj = window.State?.selectedObject;
                if (!id || !obj) return;
                await this.applyWithMaps(obj, id);
                window.UI?.syncTextureInspector?.(obj);
                window.UI?.status?.(`Material: ${id}`);
            });
        }
        document.getElementById('btn-material-examples')?.addEventListener('click', () => {
            void this.spawnExamples();
        });
        document.getElementById('btn-material-examples-clear')?.addEventListener('click', () => {
            this.clearExamples();
        });
        document.getElementById('insert-material-examples')?.addEventListener('click', () => {
            void this.spawnExamples();
            document.getElementById('insert-modal')?.classList.remove('open');
        });
        document.getElementById('insert-material-mapped')?.addEventListener('click', () => {
            void this.spawnExamples({ mappedOnly: true });
            document.getElementById('insert-modal')?.classList.remove('open');
        });
    },
};

export function initMaterialLibrary() {
    MaterialLibrary.initUi();
}

window.MaterialLibrary = MaterialLibrary;
window.initMaterialLibrary = initMaterialLibrary;
