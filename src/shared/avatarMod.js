/**
 * Avatar MOD layer — modular gear slots on formed bodies (Threshold uniqueness).
 * Profile.mods: string[] of mod ids from avatar-manifest.mods.
 * Procedural fallbacks ship with the kit; GLB overrides optional later.
 */

import * as THREE from 'three';
import { AvatarManifest } from './avatarManifest.js';

function hexToNum(hex, fallback = 0x333333) {
    if (typeof hex === 'number') return hex;
    const n = parseInt(String(hex || '').replace('#', ''), 16);
    return Number.isFinite(n) ? n : fallback;
}

function isVisibleChain(obj) {
    let p = obj;
    while (p) {
        if (p.visible === false) return false;
        p = p.parent;
    }
    return true;
}

function findAnchor(root, names = []) {
    let hit = null;
    let fallback = null;
    root.traverse((c) => {
        if (!names.includes(c.name)) return;
        if (!fallback) fallback = c;
        if (!hit && isVisibleChain(c)) hit = c;
    });
    return hit || fallback || root;
}

function disposeNode(node) {
    if (!node) return;
    node.traverse((c) => {
        c.geometry?.dispose?.();
        if (c.material) {
            if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose?.());
            else c.material.dispose?.();
        }
    });
}

function mat(color, rough = 0.75) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: rough,
        metalness: 0.08,
    });
}

/** Built-in procedural MOD builders — keep light for mobile remote LOD. */
const PROCEDURAL = {
    jacket_field(profile) {
        const g = new THREE.Group();
        g.name = 'mod_jacket_field';
        const c = hexToNum(profile?.colors?.shirt, 0x3d5a80);
        const shell = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.32, 0.52, 10),
            mat(c, 0.82)
        );
        shell.position.y = 0.02;
        shell.scale.set(1.08, 1, 1.12);
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), mat(c, 0.8));
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.28;
        g.add(shell, collar);
        return g;
    },
    vest_tactical(profile) {
        const g = new THREE.Group();
        g.name = 'mod_vest_tactical';
        const vest = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.38, 0.22),
            mat(0x2a3038, 0.7)
        );
        vest.position.y = 0.05;
        const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), mat(0x1a1e24, 0.85));
        pouchL.position.set(-0.12, -0.05, 0.12);
        const pouchR = pouchL.clone();
        pouchR.position.x = 0.12;
        g.add(vest, pouchL, pouchR);
        return g;
    },
    pack_field(profile) {
        const g = new THREE.Group();
        g.name = 'mod_pack_field';
        const pack = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.36, 0.16),
            mat(0x3a4540, 0.88)
        );
        pack.position.set(0, 0.05, -0.2);
        const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.02), mat(0x222222, 0.9));
        strapL.position.set(-0.1, 0.1, -0.05);
        const strapR = strapL.clone();
        strapR.position.x = 0.1;
        g.add(pack, strapL, strapR);
        return g;
    },
    hat_cap(profile) {
        const g = new THREE.Group();
        g.name = 'mod_hat_cap';
        const hair = hexToNum(profile?.colors?.hair, 0x2a1810);
        const crown = new THREE.Mesh(
            new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
            mat(hair, 0.9)
        );
        crown.position.y = 0.02;
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), mat(hair, 0.9));
        brim.position.y = 0.0;
        g.add(crown, brim);
        return g;
    },
    goggles_tech(profile) {
        const g = new THREE.Group();
        g.name = 'mod_goggles_tech';
        const band = new THREE.Mesh(
            new THREE.TorusGeometry(0.12, 0.018, 6, 16),
            mat(0x1a1a1a, 0.5)
        );
        band.rotation.x = Math.PI / 2;
        const lensL = new THREE.Mesh(
            new THREE.CircleGeometry(0.04, 10),
            new THREE.MeshStandardMaterial({
                color: 0x3ecf8e,
                roughness: 0.2,
                metalness: 0.4,
                transparent: true,
                opacity: 0.65,
            })
        );
        lensL.position.set(-0.05, 0, 0.12);
        const lensR = lensL.clone();
        lensR.position.x = 0.05;
        g.add(band, lensL, lensR);
        return g;
    },
};

export const AvatarMod = {
    catalog() {
        return AvatarManifest.mods?.() || {};
    },

    detachAll(group) {
        if (!group) return;
        const pieces = group.userData?._modPieces || [];
        pieces.forEach((piece) => {
            if (piece?.parent) piece.parent.remove(piece);
            disposeNode(piece);
        });
        // legacy bookkeeping node
        const layer = group.userData?._modLayer;
        if (layer?.parent) layer.parent.remove(layer);
        disposeNode(layer);
        group.userData._modPieces = [];
        group.userData._modLayer = null;
        group.userData.mods = [];
    },

    async apply(group, profile) {
        if (!group) return null;
        this.detachAll(group);

        const mods = Array.isArray(profile?.mods)
            ? profile.mods.filter(Boolean)
            : [];
        if (!mods.length) return null;

        const catalog = this.catalog();
        const anchors = {
            torso: findAnchor(group, AvatarManifest.attachPointNames('torso_prop')),
            head: findAnchor(group, AvatarManifest.attachPointNames('head_prop')),
            hair: findAnchor(group, AvatarManifest.attachPointNames('hair')),
        };

        const pieces = [];
        for (const id of mods) {
            const spec = catalog[id] || { procedural: id, attach: 'torso' };
            const builder = PROCEDURAL[spec.procedural || id] || PROCEDURAL[id];
            if (!builder) {
                console.warn('[avatar-mod] unknown mod', id);
                continue;
            }
            const piece = builder(profile);
            piece.userData.modId = id;
            piece.userData.avatarMod = true;
            piece.traverse((c) => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
            const slot = spec.attach || 'torso';
            const parent = anchors[slot] || anchors.torso || group;
            // Offset torso mods to chest height when parent is torso group
            if (slot === 'torso' && parent.name === 'torso') {
                piece.position.y += 0.05;
            }
            if (slot === 'head') {
                piece.position.y += 0.12;
            }
            parent.add(piece);
            pieces.push(piece);
        }

        group.userData._modPieces = pieces;
        group.userData.mods = [...mods];
        return pieces;
    },

    toggle(group, profile, modId, on) {
        const p = { ...profile, mods: [...(profile.mods || [])] };
        const has = p.mods.includes(modId);
        if (on && !has) p.mods.push(modId);
        if (!on && has) p.mods = p.mods.filter((m) => m !== modId);
        return this.apply(group, p).then(() => p);
    },
};

window.AvatarMod = AvatarMod;
