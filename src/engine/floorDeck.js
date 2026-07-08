/**
 * Concrete slab deck — instanced pavers with expansion joints + PBR maps.
 */
import * as THREE from 'three';
import { AssetBundle } from '../shared/assetBundle.js';
import { TextureManifest } from '../shared/textureManifest.js';
import { finishMaterial, resolveFinishSettings } from '../shared/starterTex.js';
import { IS_TOUCH_DEVICE } from './state.js';

const MANIFEST_PATH = 'textures/threshold_manifest.json';
const TEXTURE_OBJECT_NAME = 'Starter Ground';

export const FLOOR_HALF = 24;
export const SLAB_SIZE = IS_TOUCH_DEVICE ? 4 : 2;
export const SLAB_GAP = 0.042;
export const SLAB_THICK = 0.12;

function slabGridCount(halfSize) {
    const span = halfSize * 2;
    const pitch = SLAB_SIZE + SLAB_GAP;
    return Math.max(1, Math.floor((span - SLAB_GAP) / pitch));
}

function buildInstancedSlabs(THREE, halfSize) {
    const count = slabGridCount(halfSize);
    const pitch = SLAB_SIZE + SLAB_GAP;
    const origin = -((count - 1) * pitch) / 2;

    const mat = new THREE.MeshStandardMaterial({
        color: 0x8a8c90,
        roughness: 0.86,
        metalness: 0.025,
        envMapIntensity: 0.26,
    });

    const geo = new THREE.BoxGeometry(SLAB_SIZE, SLAB_THICK, SLAB_SIZE);
    const mesh = new THREE.InstancedMesh(geo, mat, count * count);
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.renderOrder = 4;
    mesh.userData = {
        id: 'engine_floor_deck',
        name: TEXTURE_OBJECT_NAME,
        isFloor: true,
        surfaceType: 'concrete',
    };

    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let iz = 0; iz < count; iz += 1) {
        for (let ix = 0; ix < count; ix += 1) {
            const jx = ((ix * 17 + iz * 31) % 7 - 3) * 0.0008;
            const jz = ((ix * 23 + iz * 13) % 7 - 3) * 0.0008;
            const jy = ((ix * 11 + iz * 19) % 5) * 0.0004;
            dummy.position.set(
                origin + ix * pitch + jx,
                jy,
                origin + iz * pitch + jz,
            );
            dummy.rotation.y = ((ix * 3 + iz * 5) % 4) * 0.003;
            dummy.updateMatrix();
            mesh.setMatrixAt(idx, dummy.matrix);
            idx += 1;
        }
    }
    mesh.instanceMatrix.needsUpdate = true;

    return { mesh, count, pitch, origin };
}

function buildSubstrate(THREE, halfSize) {
    const geo = new THREE.PlaneGeometry(halfSize * 2, halfSize * 2);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x0e1012,
        roughness: 0.98,
        metalness: 0,
        envMapIntensity: 0.08,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.058;
    mesh.receiveShadow = true;
    mesh.renderOrder = 2;
    return mesh;
}

function buildJointLines(THREE, halfSize, grid) {
    const { count, pitch, origin } = grid;
    const lines = new THREE.Group();
    const mat = new THREE.LineBasicMaterial({ color: 0x060708, transparent: true, opacity: 0.55 });
    const y = 0.061;
    const extent = halfSize - SLAB_GAP * 0.5;

    const addLine = (a, b) => {
        const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(a[0], y, a[1]),
            new THREE.Vector3(b[0], y, b[1]),
        ]);
        lines.add(new THREE.Line(geo, mat));
    };

    for (let i = 0; i <= count; i += 1) {
        const p = origin - SLAB_GAP * 0.5 + i * pitch;
        if (Math.abs(p) > extent) continue;
        addLine([-extent, p], [extent, p]);
        addLine([p, -extent], [p, extent]);
    }
    lines.renderOrder = 5;
    return lines;
}

function buildCurb(THREE, innerHalf) {
    const curbH = 0.14;
    const curbW = 0.22;
    const mat = new THREE.MeshStandardMaterial({
        color: 0x6e7074,
        roughness: 0.9,
        metalness: 0.02,
        envMapIntensity: 0.2,
    });
    const group = new THREE.Group();
    const mk = (w, d, x, z) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, curbH, d), mat);
        m.position.set(x, curbH * 0.5 - 0.02, z);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
    };
    const o = innerHalf + curbW * 0.5;
    const len = innerHalf * 2 + curbW * 2;
    mk(len, curbW, 0, o);
    mk(len, curbW, 0, -o);
    mk(curbW, len, o, 0);
    mk(curbW, len, -o, 0);
    group.renderOrder = 4;
    return group;
}

/** @returns {{ group: THREE.Group, instanced: THREE.InstancedMesh, textureTarget: object }} */
export function createConcreteSlabDeck(halfSize = 24) {
    const group = new THREE.Group();
    group.name = 'threshold-floor-slabs';

    const substrate = buildSubstrate(THREE, halfSize);
    group.add(substrate);

    const grid = buildInstancedSlabs(THREE, halfSize);
    group.add(grid.mesh);

    const joints = buildJointLines(THREE, halfSize, grid);
    group.add(joints);

    const curb = buildCurb(THREE, halfSize);
    group.add(curb);

    group.userData = {
        id: 'engine_floor_deck',
        name: TEXTURE_OBJECT_NAME,
        isFloor: true,
        surfaceType: 'concrete',
        locked: true,
        slabSize: SLAB_SIZE,
        slabGap: SLAB_GAP,
    };

    const textureTarget = {
        material: grid.mesh.material,
        userData: group.userData,
        isMesh: true,
    };

    return { group, instanced: grid.mesh, substrate, textureTarget, curb };
}

export async function wireDeckTextures(textureTarget) {
    const TB = window.TextureBridge;
    if (!TB || !textureTarget?.material) return { maps: 0 };

    let manifest;
    try {
        const res = await fetch(AssetBundle.getUrl(MANIFEST_PATH));
        if (!res.ok) return { maps: 0, err: 'no manifest' };
        manifest = TextureManifest.parse(await res.json());
    } catch (e) {
        return { maps: 0, err: e.message };
    }

    const entries = TextureManifest.entriesForObject(manifest, TEXTURE_OBJECT_NAME);
    if (!entries.length) return { maps: 0 };

    let maps = 0;
    for (const entry of entries) {
        const filePath = entry.path || `textures/${entry.file}`;
        try {
            await TB.applyPathToObject(textureTarget, entry.slot, filePath);
            maps += 1;
        } catch (e) {
            console.warn('[floor-deck]', entry.slot, e);
        }
    }

    const rep = SLAB_SIZE * 0.5;
    finishMaterial(textureTarget, {
        ...resolveFinishSettings(textureTarget),
        uvRepeat: [rep, rep],
        normalScale: 0.95,
        envMapIntensity: 0.3,
    });

    return { maps };
}