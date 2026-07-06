import { SoundLibrary } from './soundLibrary.js';
import { AssetBundle } from './assetBundle.js';

const MANIFEST_FP_KEY = 'threshold_starter_manifest_fp';
let seeded = false;
let seedingPromise = null;

const YIELD_EVERY = 4;

export function fingerprintManifest(manifest) {
    if (!manifest) return '';
    const parts = [
        manifest.format || '',
        String(manifest.version ?? 0),
        String(manifest.sampleRate ?? 0),
        ...(manifest.clips || []).map((c) => [
            c.id,
            c.bytes ?? 0,
            c.oggBytes ?? 0,
            c.preferred ?? '',
            c.wav ? c.wav.split('/').pop() : '',
            c.ogg ? c.ogg.split('/').pop() : '',
        ].join('|')),
    ];
    let h = 5381;
    const str = parts.join('\n');
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h) ^ str.charCodeAt(i);
    }
    return `v${manifest.version}-${(h >>> 0).toString(36)}`;
}

export function getStoredManifestFingerprint() {
    try {
        return localStorage.getItem(MANIFEST_FP_KEY) || '';
    } catch {
        return '';
    }
}

export function storeManifestFingerprint(fp) {
    try {
        if (fp) localStorage.setItem(MANIFEST_FP_KEY, fp);
    } catch { /* */ }
}

export function manifestFullyCached(manifest) {
    const ids = (manifest?.clips || []).map((c) => c.id);
    return SoundLibrary.hasAllClipIds(ids);
}

function yieldToMain() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

export async function seedStarterSounds(force = false) {
    if (seeded && !force) return { n: 0, skipped: true, reason: 'session' };
    if (seedingPromise && !force) return seedingPromise;

    seedingPromise = (async () => {
        let manifest;
        try {
            const res = await fetch(AssetBundle.getUrl('sounds/starter/starter-sounds.json'));
            if (!res.ok) return { n: 0, err: `manifest ${res.status}` };
            manifest = await res.json();
        } catch (e) {
            return { n: 0, err: e.message };
        }

        const fp = fingerprintManifest(manifest);
        const clipIds = (manifest.clips || []).map((c) => c.id);

        if (!force && fp && fp === getStoredManifestFingerprint() && manifestFullyCached(manifest)) {
            seeded = true;
            return {
                n: 0,
                skipped: true,
                reason: 'manifest',
                clips: clipIds.length,
                fingerprint: fp,
            };
        }

        let n = 0;
        let processed = 0;
        for (const clip of manifest.clips || []) {
            if (!force && await SoundLibrary.getMeta(clip.id)) continue;

            const preferOgg = clip.preferred !== 'wav';
            const paths = [
                preferOgg && clip.ogg ? `sounds/starter/${clip.ogg.split('/').pop()}` : null,
                clip.wav ? `sounds/starter/${clip.wav.split('/').pop()}` : null,
                !preferOgg && clip.ogg ? `sounds/starter/${clip.ogg.split('/').pop()}` : null,
            ].filter(Boolean);

            let blob = null;
            for (const p of paths) {
                blob = await AssetBundle.fetchBlob(p);
                if (blob) break;
            }
            if (!blob) {
                console.warn('[starter-sfx] missing', clip.id);
                continue;
            }

            await SoundLibrary.saveClipWithId(clip.id, clip.name, blob, {
                context: clip.category ? `Starter ${clip.category}` : 'Starter FX',
                license: clip.license || 'Original — Threshold',
                targetType: clip.vehicle ? 'vehicle' : 'world',
                targetId: clip.vehicle,
            });
            n += 1;
            processed += 1;
            if (processed % YIELD_EVERY === 0) await yieldToMain();
        }

        if (SoundLibrary.hasAllClipIds(clipIds)) {
            storeManifestFingerprint(fp);
        }

        seeded = true;
        return { n, clips: clipIds.length, fingerprint: fp };
    })();

    try {
        return await seedingPromise;
    } finally {
        seedingPromise = null;
    }
}

const ENGINE_MAP = {
    tc_run: 'starter_eng_two_stroke',
    tc_haul: 'starter_eng_v8',
};

export function engineClipForVehicle(vehicleId) {
    return ENGINE_MAP[vehicleId] || ENGINE_MAP.tc_run;
}

const METAL_HIT_POOL = ['starter_metal_hit', 'starter_metal_hit_user'];

export function playStarterSfx(clipId, volume = 0.85) {
    window.AudioSys?.playClip?.(clipId, volume);
}

export function playMetalImpact(volume = 0.68) {
    const clipId = METAL_HIT_POOL[Math.floor(Math.random() * METAL_HIT_POOL.length)];
    window.AudioSys?.playClipVariation?.(clipId, {
        volume,
        playbackRate: 0.92 + Math.random() * 0.14,
    });
}

function findObjectRoot(obj) {
    let node = obj;
    while (node) {
        if (node.userData?.id) return node;
        node = node.parent;
    }
    return obj;
}

function shatterGlass(root) {
    if (!root || root.userData?.shattered) return;
    root.userData.shattered = true;
    root.visible = false;

    const State = window.State;
    const entry = State?.physicsObjects?.find((p) => p.mesh === root || root.children?.includes?.(p.mesh));
    if (entry?.body) {
        State.physicsObjects = State.physicsObjects.filter((p) => p !== entry);
        window.Physics?.world?.removeBody(entry.body);
    }
    if (State?.objects) {
        const idx = State.objects.indexOf(root);
        if (idx >= 0) State.objects.splice(idx, 1);
    }
    playStarterSfx('starter_glass_break', 0.72);
}

export function fireStarterGun() {
    const Engine = window.Engine;
    const THREE = window.THREE;
    const PC = window.PlayerController;
    const State = window.State;
    if (!Engine?.camera || !THREE || State?.isPaused) return false;
    if (window.Controls?.isHolstered?.()) return false;

    window.AudioSys?.playClipVariation?.('starter_gun_pistol', {
        volume: 0.72 + Math.random() * 0.12,
        playbackRate: 0.96 + Math.random() * 0.08,
    });

    const origin = new THREE.Vector3();
    const dir = new THREE.Vector3();
    Engine.camera.getWorldDirection(dir);
    origin.copy(Engine.camera.position);

    const ads = PC?._adsBlend ?? 0;
    const spread = THREE.MathUtils.lerp(0.028, 0.004, ads);
    if (spread > 0.005) {
        dir.x += (Math.random() - 0.5) * spread;
        dir.y += (Math.random() - 0.5) * spread;
        dir.z += (Math.random() - 0.5) * spread;
    }

    const raycaster = new THREE.Raycaster(origin, dir.normalize(), 0, 52);
    const hits = raycaster.intersectObjects(State?.objects || [], true);

    for (const hit of hits) {
        const root = findObjectRoot(hit.object);
        const id = root.userData?.id;
        if (id === 'glass_pane') {
            shatterGlass(root);
            return true;
        }
        if (id === 'gun_target' || id === 'starter_crate') {
            playMetalImpact(0.68);
            return true;
        }
    }
    return true;
}

const SOUND_MAP = {
    tc_run: { clipId: 'starter_eng_two_stroke', trigger: 'ambient' },
    tc_haul: { clipId: 'starter_eng_v8', trigger: 'ambient' },
    ai_terminal: { clipId: 'starter_door_lock', trigger: 'interact' },
    model_kiosk: { clipId: 'starter_door_lock', trigger: 'interact' },
    starter_crate: { clipId: 'starter_metal_hit', trigger: 'collision' },
    glass_pane: { clipId: 'starter_glass_break', trigger: 'collision' },
    gun_target: { clipId: 'starter_metal_hit', trigger: 'collision' },
    starter_interior_door: { clipId: 'starter_interior_door_creak', trigger: 'interact' },
    starter_elevator_kiosk: { clipId: 'starter_interior_elevator_ding', trigger: 'interact' },
    starter_shop_counter: { clipId: 'starter_interior_cash_register', trigger: 'interact' },
    starter_tesla_door: { clipId: 'starter_interior_door_creak', trigger: 'interact' },
};

export function wireStarterSounds() {
    let w = 0;
    (window.State?.objects || []).forEach((obj) => {
        const spec = SOUND_MAP[obj.userData?.id];
        if (!spec) return;
        obj.userData.soundMode = 'clip';
        obj.userData.soundClipId = spec.clipId;
        obj.userData.soundTrigger = spec.trigger;
        if (spec.trigger === 'ambient') obj.userData.engineClipId = spec.clipId;
        w += 1;
    });
    return w;
}

/** @deprecated use wireStarterSounds */
export function wireStarterVehicleEngines() {
    return wireStarterSounds();
}

window.StarterSfx = {
    seedStarterSounds,
    wireStarterSounds,
    wireStarterVehicleEngines,
    engineClipForVehicle,
    playStarterSfx,
    playMetalImpact,
    fireStarterGun,
};