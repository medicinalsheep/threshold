/**
 * Avatar MOD layer — full modular gear system (Threshold uniqueness).
 *
 * Catalog: config/avatar-mods.json (slots · exclusive/stack · categories · presets)
 * Profile.mods: string[] of mod ids
 * Procedural builders + optional GLB overrides; LOD-aware anchors; conflict resolve
 */

import * as THREE from 'three';
import { AssetBundle } from './assetBundle.js';
import { AvatarManifest } from './avatarManifest.js';
import modCatalog from '../../config/avatar-mods.json';

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

function findNamed(root, names = []) {
    let hit = null;
    let fallback = null;
    root.traverse((c) => {
        if (!names.includes(c.name)) return;
        if (!fallback) fallback = c;
        if (!hit && isVisibleChain(c)) hit = c;
    });
    return hit || fallback || null;
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

function mat(color, rough = 0.75, metal = 0.08) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: rough,
        metalness: metal,
    });
}

function emissiveMat(color, emissive, intensity = 0.45) {
    return new THREE.MeshStandardMaterial({
        color,
        emissive,
        emissiveIntensity: intensity,
        roughness: 0.35,
        metalness: 0.35,
    });
}

function shadow(g) {
    g.traverse((c) => {
        if (c.isMesh) {
            c.castShadow = true;
            c.receiveShadow = true;
        }
    });
    return g;
}

function shirt(p) {
    return hexToNum(p?.colors?.shirt, 0x3d5a80);
}
function hair(p) {
    return hexToNum(p?.colors?.hair, 0x2a1810);
}
function pants(p) {
    return hexToNum(p?.colors?.pants, 0x232830);
}

/** Extra anchors beyond manifest attachPoints */
const ANCHOR_ALIASES = {
    head: ['head', 'prop_head', 'hair_anchor'],
    hair: ['hair_anchor', 'head'],
    neck: ['neck', 'collar', 'head'],
    torso: ['torso', 'shoulders', 'prop_torso'],
    hips: ['hips', 'torso'],
    hand_r: ['hand_R', 'hand_r', 'armR', 'arm_r'],
    hand_l: ['hand_L', 'hand_l', 'armL', 'arm_l'],
};

// ─── Procedural builders ───────────────────────────────────────────
const PROCEDURAL = {
    hat_cap(p) {
        const g = new THREE.Group();
        g.name = 'mod_hat_cap';
        const c = hair(p);
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(c, 0.9)));
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 12), mat(c, 0.9));
        brim.position.y = 0;
        g.add(brim);
        return shadow(g);
    },
    hat_beanie(p) {
        const g = new THREE.Group();
        g.name = 'mod_hat_beanie';
        const c = shirt(p);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.155, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mat(c, 0.95));
        dome.position.y = 0.02;
        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 14), mat(c, 0.92));
        cuff.rotation.x = Math.PI / 2;
        cuff.position.y = -0.02;
        const pom = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(c, 0.9));
        pom.position.y = 0.16;
        g.add(dome, cuff, pom);
        return shadow(g);
    },
    hat_wide_brim(p) {
        const g = new THREE.Group();
        g.name = 'mod_hat_wide_brim';
        const c = 0x5a4a32;
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 12), mat(c, 0.88)));
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.015, 16), mat(c, 0.9));
        brim.position.y = -0.02;
        g.add(brim);
        return shadow(g);
    },
    helmet_tactical() {
        const g = new THREE.Group();
        g.name = 'mod_helmet_tactical';
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58), mat(0x2a3038, 0.55, 0.25));
        shell.position.y = 0.02;
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), mat(0x1a1e22, 0.5, 0.3));
        rail.position.set(0, 0.08, 0.12);
        const nvg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.1), mat(0x111418, 0.4, 0.4));
        nvg.position.set(0, 0.06, 0.16);
        g.add(shell, rail, nvg);
        return shadow(g);
    },
    helmet_space() {
        const g = new THREE.Group();
        g.name = 'mod_helmet_space';
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 18), mat(0xc8d0d8, 0.35, 0.55));
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.02;
        const dome = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
            mat(0xe8eef4, 0.25, 0.2)
        );
        dome.position.y = 0.04;
        g.add(ring, dome);
        return shadow(g);
    },
    hood_cloak(p) {
        const g = new THREE.Group();
        g.name = 'mod_hood_cloak';
        const c = pants(p);
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(c, 0.92));
        hood.position.set(0, 0.04, -0.02);
        hood.scale.set(1.05, 1, 1.1);
        g.add(hood);
        return shadow(g);
    },
    hardhat_lab() {
        const g = new THREE.Group();
        g.name = 'mod_hardhat_lab';
        const shell = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), mat(0xf0c040, 0.55));
        const brim = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.1), mat(0xf0c040, 0.55));
        brim.position.set(0, -0.02, 0.12);
        g.add(shell, brim);
        return shadow(g);
    },
    crown_rp() {
        const g = new THREE.Group();
        g.name = 'mod_crown_rp';
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 16), mat(0xd4af37, 0.35, 0.7));
        band.rotation.x = Math.PI / 2;
        band.position.y = 0.08;
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const spike = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 6), mat(0xd4af37, 0.35, 0.7));
            spike.position.set(Math.cos(a) * 0.12, 0.12, Math.sin(a) * 0.12);
            g.add(spike);
        }
        g.add(band);
        return shadow(g);
    },

    goggles_tech() {
        const g = new THREE.Group();
        g.name = 'mod_goggles_tech';
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.016, 6, 16), mat(0x1a1a1a, 0.5));
        band.rotation.x = Math.PI / 2;
        const lens = () => new THREE.Mesh(
            new THREE.CircleGeometry(0.04, 10),
            new THREE.MeshStandardMaterial({
                color: 0x3ecf8e, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.65,
            })
        );
        const l = lens(); l.position.set(-0.05, 0, 0.12);
        const r = lens(); r.position.set(0.05, 0, 0.12);
        g.add(band, l, r);
        return shadow(g);
    },
    goggles_welding() {
        const g = new THREE.Group();
        g.name = 'mod_goggles_welding';
        const frame = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.06), mat(0x222222, 0.6));
        frame.position.z = 0.12;
        const glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.14, 0.04, 0.02),
            new THREE.MeshStandardMaterial({ color: 0x1a3a20, roughness: 0.15, metalness: 0.2, transparent: true, opacity: 0.8 })
        );
        glass.position.z = 0.14;
        g.add(frame, glass);
        return shadow(g);
    },
    visor_hud() {
        const g = new THREE.Group();
        g.name = 'mod_visor_hud';
        const visor = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.06, 0.04),
            emissiveMat(0x1a2840, 0x3ecf8e, 0.6)
        );
        visor.position.set(0, 0.02, 0.13);
        g.add(visor);
        return shadow(g);
    },
    mask_respirator() {
        const g = new THREE.Group();
        g.name = 'mod_mask_respirator';
        const cup = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(0x2a3038, 0.55));
        cup.position.set(0, -0.04, 0.12);
        cup.scale.set(1.1, 0.9, 1);
        const filter = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), mat(0x3a4038, 0.7));
        filter.rotation.z = Math.PI / 2;
        filter.position.set(0.08, -0.05, 0.14);
        g.add(cup, filter);
        return shadow(g);
    },
    mask_surgical() {
        const g = new THREE.Group();
        g.name = 'mod_mask_surgical';
        const m = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.03), mat(0xc8d4e0, 0.85));
        m.position.set(0, -0.04, 0.13);
        g.add(m);
        return shadow(g);
    },
    glasses_round() {
        const g = new THREE.Group();
        g.name = 'mod_glasses_round';
        const rim = mat(0x222222, 0.4, 0.3);
        const glass = new THREE.MeshStandardMaterial({
            color: 0x88aacc, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.35,
        });
        [-0.05, 0.05].forEach((x) => {
            g.add(new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 6, 12), rim).translateX(x).translateZ(0.13));
            const lens = new THREE.Mesh(new THREE.CircleGeometry(0.032, 12), glass);
            lens.position.set(x, 0, 0.13);
            g.add(lens);
        });
        const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.01, 0.01), rim);
        bridge.position.set(0, 0, 0.13);
        g.add(bridge);
        return shadow(g);
    },
    eyepatch_rp() {
        const g = new THREE.Group();
        g.name = 'mod_eyepatch_rp';
        const patch = new THREE.Mesh(new THREE.CircleGeometry(0.035, 10), mat(0x1a1210, 0.9));
        patch.position.set(-0.05, 0.02, 0.13);
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.008), mat(0x1a1210, 0.9));
        strap.position.set(0, 0.02, 0.12);
        g.add(patch, strap);
        return shadow(g);
    },

    scarf_field(p) {
        const g = new THREE.Group();
        g.name = 'mod_scarf_field';
        const c = shirt(p);
        const loop = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.04, 8, 14), mat(c, 0.9));
        loop.rotation.x = Math.PI / 2;
        const drape = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.04), mat(c, 0.9));
        drape.position.set(0.08, -0.12, 0.04);
        g.add(loop, drape);
        return shadow(g);
    },
    collar_comm() {
        const g = new THREE.Group();
        g.name = 'mod_collar_comm';
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 14), mat(0x3a4550, 0.4, 0.5));
        band.rotation.x = Math.PI / 2;
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), emissiveMat(0x222, 0x3ecf8e, 0.9));
        led.position.set(0.1, 0, 0.02);
        g.add(band, led);
        return shadow(g);
    },
    pendant_rp() {
        const g = new THREE.Group();
        g.name = 'mod_pendant_rp';
        const chain = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.006, 4, 12), mat(0xc0c0c0, 0.3, 0.8));
        chain.rotation.x = Math.PI / 2;
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), mat(0x5a2a8a, 0.25, 0.4));
        gem.position.y = -0.1;
        g.add(chain, gem);
        return shadow(g);
    },
    id_lanyard() {
        const g = new THREE.Group();
        g.name = 'mod_id_lanyard';
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.22, 0.01), mat(0x3366aa, 0.7));
        strap.position.set(0, -0.08, 0.08);
        const badge = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.012), mat(0xf0f0f0, 0.5));
        badge.position.set(0, -0.2, 0.08);
        g.add(strap, badge);
        return shadow(g);
    },

    jacket_field(p) {
        const g = new THREE.Group();
        g.name = 'mod_jacket_field';
        const c = shirt(p);
        const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.52, 10), mat(c, 0.82));
        shell.position.y = 0.02;
        shell.scale.set(1.08, 1, 1.12);
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 12), mat(c, 0.8));
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.28;
        g.add(shell, collar);
        return shadow(g);
    },
    coat_lab() {
        const g = new THREE.Group();
        g.name = 'mod_coat_lab';
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.7, 10), mat(0xf2f4f8, 0.75));
        body.position.y = -0.05;
        body.scale.set(1.05, 1, 1.1);
        const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.04), mat(0xf2f4f8, 0.7));
        lapel.position.set(-0.08, 0.2, 0.14);
        g.add(body, lapel);
        return shadow(g);
    },
    hoodie_urban(p) {
        const g = new THREE.Group();
        g.name = 'mod_hoodie_urban';
        const c = shirt(p);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.5, 10), mat(c, 0.9));
        body.scale.set(1.05, 1, 1.08);
        const hood = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), mat(c, 0.92));
        hood.position.set(0, 0.32, -0.06);
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.06), mat(c, 0.88));
        pouch.position.set(0, -0.08, 0.14);
        g.add(body, hood, pouch);
        return shadow(g);
    },
    poncho_rain() {
        const g = new THREE.Group();
        g.name = 'mod_poncho_rain';
        const sheet = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.55, 8, 1, true), mat(0x2a5a48, 0.55));
        sheet.position.y = 0.05;
        g.add(sheet);
        return shadow(g);
    },
    cloak_rp(p) {
        const g = new THREE.Group();
        g.name = 'mod_cloak_rp';
        const c = pants(p);
        const cape = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.75, 0.08), mat(c, 0.9));
        cape.position.set(0, -0.1, -0.18);
        const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat(0xd4af37, 0.4, 0.6));
        clasp.position.set(0, 0.28, 0.1);
        g.add(cape, clasp);
        return shadow(g);
    },
    armor_chest_plate() {
        const g = new THREE.Group();
        g.name = 'mod_armor_chest_plate';
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.42, 0.12), mat(0x6a7078, 0.4, 0.55));
        plate.position.y = 0.06;
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.14), mat(0x8a9098, 0.35, 0.6));
        ridge.position.y = 0.06;
        g.add(plate, ridge);
        return shadow(g);
    },
    suit_formal(p) {
        const g = new THREE.Group();
        g.name = 'mod_suit_formal';
        const c = pants(p);
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.28, 0.48, 10), mat(c, 0.7));
        body.scale.set(1.05, 1, 1.05);
        const lapelL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.03), mat(c, 0.65));
        lapelL.position.set(-0.08, 0.12, 0.13);
        const lapelR = lapelL.clone();
        lapelR.position.x = 0.08;
        g.add(body, lapelL, lapelR);
        return shadow(g);
    },
    hazmat_suit() {
        const g = new THREE.Group();
        g.name = 'mod_hazmat_suit';
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.65, 10), mat(0xe8d040, 0.65));
        body.position.y = -0.02;
        body.scale.set(1.1, 1, 1.15);
        const tape = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 4, 12), mat(0x222, 0.8));
        tape.rotation.x = Math.PI / 2;
        tape.position.y = 0.25;
        g.add(body, tape);
        return shadow(g);
    },

    vest_tactical() {
        const g = new THREE.Group();
        g.name = 'mod_vest_tactical';
        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.22), mat(0x2a3038, 0.7));
        vest.position.y = 0.05;
        const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.06), mat(0x1a1e24, 0.85));
        pouchL.position.set(-0.12, -0.05, 0.12);
        const pouchR = pouchL.clone();
        pouchR.position.x = 0.12;
        g.add(vest, pouchL, pouchR);
        return shadow(g);
    },
    vest_press() {
        const g = new THREE.Group();
        g.name = 'mod_vest_press';
        const vest = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.36, 0.18), mat(0x2a5a9a, 0.75));
        const text = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.02), mat(0xf0f0f0, 0.5));
        text.position.set(0, 0.08, 0.1);
        g.add(vest, text);
        return shadow(g);
    },
    harness_climb() {
        const g = new THREE.Group();
        g.name = 'mod_harness_climb';
        const strapH = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.02, 4, 12), mat(0xc45a20, 0.7));
        strapH.rotation.x = Math.PI / 2;
        const strapV = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.03), mat(0xc45a20, 0.7));
        strapV.position.set(-0.12, 0, 0.05);
        const strapV2 = strapV.clone();
        strapV2.position.x = 0.12;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 4, 10), mat(0x888, 0.3, 0.7));
        ring.position.set(0, -0.1, 0.12);
        g.add(strapH, strapV, strapV2, ring);
        return shadow(g);
    },
    apron_workshop() {
        const g = new THREE.Group();
        g.name = 'mod_apron_workshop';
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.5, 0.04), mat(0x5a4030, 0.88));
        body.position.set(0, -0.05, 0.14);
        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.03), mat(0x4a3020, 0.9));
        pocket.position.set(0, -0.15, 0.16);
        g.add(body, pocket);
        return shadow(g);
    },
    bandolier_rp() {
        const g = new THREE.Group();
        g.name = 'mod_bandolier_rp';
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.03), mat(0x4a3020, 0.85));
        strap.position.set(0.05, 0.02, 0.1);
        strap.rotation.z = -0.45;
        for (let i = 0; i < 5; i++) {
            const cart = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.06, 6), mat(0xb0a060, 0.4, 0.5));
            cart.position.set(0.02 + i * 0.02, 0.15 - i * 0.06, 0.14);
            cart.rotation.z = Math.PI / 2;
            g.add(cart);
        }
        g.add(strap);
        return shadow(g);
    },
    lifevest_water() {
        const g = new THREE.Group();
        g.name = 'mod_lifevest_water';
        const L = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.4, 0.12), mat(0xe8a020, 0.7));
        L.position.set(-0.12, 0.05, 0.1);
        const R = L.clone();
        R.position.x = 0.12;
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), mat(0x222, 0.8));
        strap.position.set(0, 0.2, 0.1);
        g.add(L, R, strap);
        return shadow(g);
    },

    pack_field() {
        const g = new THREE.Group();
        g.name = 'mod_pack_field';
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.16), mat(0x3a4540, 0.88));
        pack.position.set(0, 0.05, -0.2);
        const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.4, 0.02), mat(0x222, 0.9));
        strapL.position.set(-0.1, 0.1, -0.05);
        const strapR = strapL.clone();
        strapR.position.x = 0.1;
        g.add(pack, strapL, strapR);
        return shadow(g);
    },
    pack_tactical() {
        const g = new THREE.Group();
        g.name = 'mod_pack_tactical';
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.42, 0.18), mat(0x2a3030, 0.75));
        pack.position.set(0, 0.05, -0.22);
        const molle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.02, 0.02), mat(0x1a1e1e, 0.8));
        molle.position.set(0, 0.15, -0.31);
        g.add(pack, molle, molle.clone().translateY(-0.08), molle.clone().translateY(-0.16));
        return shadow(g);
    },
    pack_day() {
        const g = new THREE.Group();
        g.name = 'mod_pack_day';
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.12), mat(0x4a6080, 0.8));
        pack.position.set(0, 0.08, -0.18);
        g.add(pack);
        return shadow(g);
    },
    jetpack_scifi() {
        const g = new THREE.Group();
        g.name = 'mod_jetpack_scifi';
        const tankL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.35, 10), mat(0x5a6a7a, 0.35, 0.5));
        tankL.position.set(-0.1, 0.05, -0.22);
        const tankR = tankL.clone();
        tankR.position.x = 0.1;
        const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.08, 8), emissiveMat(0x333, 0xff6622, 0.7));
        nozzle.position.set(-0.1, -0.18, -0.22);
        nozzle.rotation.x = Math.PI;
        const nozzle2 = nozzle.clone();
        nozzle2.position.x = 0.1;
        g.add(tankL, tankR, nozzle, nozzle2);
        return shadow(g);
    },
    tank_scuba() {
        const g = new THREE.Group();
        g.name = 'mod_tank_scuba';
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 12), mat(0xc8d0d8, 0.3, 0.55));
        tank.position.set(0, 0.05, -0.22);
        const valve = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(0x888, 0.3, 0.6));
        valve.position.set(0, 0.3, -0.22);
        g.add(tank, valve);
        return shadow(g);
    },
    cape_rp(p) {
        const g = new THREE.Group();
        g.name = 'mod_cape_rp';
        const cape = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.05), mat(pants(p), 0.9));
        cape.position.set(0, -0.15, -0.2);
        g.add(cape);
        return shadow(g);
    },

    belt_utility() {
        const g = new THREE.Group();
        g.name = 'mod_belt_utility';
        const belt = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 16), mat(0x3a3028, 0.75));
        belt.rotation.x = Math.PI / 2;
        belt.position.y = 0.05;
        const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.06), mat(0x2a2420, 0.8));
        pouch.position.set(0.18, 0.02, 0.08);
        g.add(belt, pouch, pouch.clone().translateX(-0.36));
        return shadow(g);
    },
    belt_tactical() {
        const g = new THREE.Group();
        g.name = 'mod_belt_tactical';
        const belt = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.028, 6, 16), mat(0x2a3030, 0.65));
        belt.rotation.x = Math.PI / 2;
        const holster = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.05), mat(0x1a1e1e, 0.7));
        holster.position.set(0.18, -0.02, 0.05);
        g.add(belt, holster);
        return shadow(g);
    },
    sash_rp(p) {
        const g = new THREE.Group();
        g.name = 'mod_sash_rp';
        const sash = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.03), mat(shirt(p), 0.85));
        sash.position.set(0, 0.05, 0.1);
        sash.rotation.z = 0.35;
        g.add(sash);
        return shadow(g);
    },
    fanny_urban() {
        const g = new THREE.Group();
        g.name = 'mod_fanny_urban';
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.08), mat(0x3a4a5a, 0.75));
        bag.position.set(0.15, 0.02, 0.12);
        g.add(bag);
        return shadow(g);
    },

    greaves_light() {
        const g = new THREE.Group();
        g.name = 'mod_greaves_light';
        [-0.12, 0.12].forEach((x) => {
            const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.08), mat(0x6a7078, 0.45, 0.5));
            plate.position.set(x, -0.35, 0.05);
            g.add(plate);
        });
        return shadow(g);
    },
    kneepads_field() {
        const g = new THREE.Group();
        g.name = 'mod_kneepads_field';
        [-0.12, 0.12].forEach((x) => {
            const pad = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0x3a4038, 0.8));
            pad.position.set(x, -0.25, 0.08);
            pad.scale.set(1, 0.7, 0.8);
            g.add(pad);
        });
        return shadow(g);
    },
    skirt_rp(p) {
        const g = new THREE.Group();
        g.name = 'mod_skirt_rp';
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 0.35, 10, 1, true), mat(shirt(p), 0.88));
        wrap.position.y = -0.15;
        g.add(wrap);
        return shadow(g);
    },

    boots_field() {
        const g = new THREE.Group();
        g.name = 'mod_boots_field';
        [-0.12, 0.12].forEach((x) => {
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.22), mat(0x3a3028, 0.8));
            boot.position.set(x, -0.75, 0.04);
            g.add(boot);
        });
        return shadow(g);
    },
    boots_combat() {
        const g = new THREE.Group();
        g.name = 'mod_boots_combat';
        [-0.12, 0.12].forEach((x) => {
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.22, 0.24), mat(0x1a1e1e, 0.7));
            boot.position.set(x, -0.72, 0.05);
            g.add(boot);
        });
        return shadow(g);
    },
    shoes_casual() {
        const g = new THREE.Group();
        g.name = 'mod_shoes_casual';
        [-0.12, 0.12].forEach((x) => {
            const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.22), mat(0x4a4a5a, 0.75));
            shoe.position.set(x, -0.8, 0.04);
            g.add(shoe);
        });
        return shadow(g);
    },
    boots_lab() {
        const g = new THREE.Group();
        g.name = 'mod_boots_lab';
        [-0.12, 0.12].forEach((x) => {
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.2), mat(0xe8e8e8, 0.55));
            boot.position.set(x, -0.76, 0.03);
            g.add(boot);
        });
        return shadow(g);
    },

    gloves_work() {
        const g = new THREE.Group();
        g.name = 'mod_gloves_work';
        // Visual cue on lower arms when parented to torso — offset laterally
        [-0.32, 0.32].forEach((x) => {
            const glove = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0x5a4830, 0.85));
            glove.position.set(x, -0.35, 0.05);
            g.add(glove);
        });
        return shadow(g);
    },
    gloves_tactical() {
        const g = new THREE.Group();
        g.name = 'mod_gloves_tactical';
        [-0.32, 0.32].forEach((x) => {
            const glove = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(0x2a3030, 0.7));
            glove.position.set(x, -0.35, 0.05);
            g.add(glove);
        });
        return shadow(g);
    },
    bracers_rp() {
        const g = new THREE.Group();
        g.name = 'mod_bracers_rp';
        [-0.3, 0.3].forEach((x) => {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.14, 8), mat(0x6a5a40, 0.6, 0.3));
            b.position.set(x, -0.25, 0.02);
            g.add(b);
        });
        return shadow(g);
    },

    prop_tablet() {
        const g = new THREE.Group();
        g.name = 'mod_prop_tablet';
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.015), mat(0x1a1a1a, 0.4, 0.3));
        const screen = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.005), emissiveMat(0x111, 0x3ecf8e, 0.5));
        screen.position.z = 0.01;
        g.add(body, screen);
        return shadow(g);
    },
    prop_scanner() {
        const g = new THREE.Group();
        g.name = 'mod_prop_scanner';
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.04), mat(0x3a4a5a, 0.45, 0.4));
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.04, 10), emissiveMat(0x222, 0x5ad4ff, 0.7));
        lens.rotation.x = Math.PI / 2;
        lens.position.set(0, 0.05, 0.04);
        g.add(body, lens);
        return shadow(g);
    },
    prop_flashlight() {
        const g = new THREE.Group();
        g.name = 'mod_prop_flashlight';
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), mat(0x333, 0.4, 0.5));
        body.rotation.z = Math.PI / 2;
        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.04, 8), mat(0x555, 0.4, 0.4));
        head.rotation.z = Math.PI / 2;
        head.position.x = 0.1;
        g.add(body, head);
        return shadow(g);
    },
    prop_rifle_slung() {
        const g = new THREE.Group();
        g.name = 'mod_prop_rifle_slung';
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.28), mat(0x3a3028, 0.8));
        stock.position.set(0.15, 0.1, -0.1);
        stock.rotation.x = 0.4;
        stock.rotation.z = -0.3;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.35, 6), mat(0x2a2a2a, 0.4, 0.5));
        barrel.rotation.z = Math.PI / 2;
        barrel.position.set(0.15, 0.18, 0.05);
        g.add(stock, barrel);
        return shadow(g);
    },
    prop_staff_rp() {
        const g = new THREE.Group();
        g.name = 'mod_prop_staff_rp';
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.1, 6), mat(0x5a4030, 0.85));
        staff.position.set(0.25, 0.1, 0);
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), emissiveMat(0x4a2080, 0xaa44ff, 0.6));
        gem.position.set(0.25, 0.68, 0);
        g.add(staff, gem);
        return shadow(g);
    },
    prop_camera() {
        const g = new THREE.Group();
        g.name = 'mod_prop_camera';
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.06), mat(0x222, 0.5));
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.04, 10), mat(0x111, 0.3, 0.4));
        lens.rotation.x = Math.PI / 2;
        lens.position.z = 0.05;
        g.add(body, lens);
        return shadow(g);
    },
    prop_toolbag() {
        const g = new THREE.Group();
        g.name = 'mod_prop_toolbag';
        const bag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.08), mat(0x4a3828, 0.85));
        bag.position.set(-0.25, -0.2, 0.05);
        g.add(bag);
        return shadow(g);
    },
    prop_shield_rp() {
        const g = new THREE.Group();
        g.name = 'mod_prop_shield_rp';
        const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12), mat(0x6a5a40, 0.55, 0.35));
        shield.rotation.x = Math.PI / 2;
        shield.position.set(-0.28, 0.05, 0.05);
        const boss = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), mat(0xd4af37, 0.35, 0.6));
        boss.position.set(-0.28, 0.05, 0.08);
        g.add(shield, boss);
        return shadow(g);
    },
    prop_clipboard() {
        const g = new THREE.Group();
        g.name = 'mod_prop_clipboard';
        const board = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.01), mat(0x8a7050, 0.8));
        board.position.set(-0.22, 0.05, 0.1);
        const paper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.13, 0.005), mat(0xf5f0e8, 0.6));
        paper.position.set(-0.22, 0.05, 0.11);
        g.add(board, paper);
        return shadow(g);
    },

    acc_badge() {
        const g = new THREE.Group();
        g.name = 'mod_acc_badge';
        const badge = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), mat(0xd4af37, 0.35, 0.65));
        badge.position.set(0.12, 0.15, 0.14);
        g.add(badge);
        return shadow(g);
    },
    acc_radio() {
        const g = new THREE.Group();
        g.name = 'mod_acc_radio';
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.03), mat(0x2a3030, 0.55));
        box.position.set(0.18, 0.22, 0.05);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.1, 4), mat(0x888, 0.4, 0.5));
        ant.position.set(0.18, 0.3, 0.05);
        g.add(box, ant);
        return shadow(g);
    },
    acc_patch_flag() {
        const g = new THREE.Group();
        g.name = 'mod_acc_patch_flag';
        const patch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.01), mat(0x3a5a9a, 0.7));
        patch.position.set(-0.18, 0.18, 0.12);
        g.add(patch);
        return shadow(g);
    },
    acc_watch() {
        const g = new THREE.Group();
        g.name = 'mod_acc_watch';
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.01, 4, 10), mat(0x333, 0.5));
        band.position.set(0.3, -0.2, 0.02);
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.025, 10), emissiveMat(0x111, 0x3ecf8e, 0.5));
        face.position.set(0.3, -0.2, 0.04);
        g.add(band, face);
        return shadow(g);
    },
    acc_camera_body() {
        const g = new THREE.Group();
        g.name = 'mod_acc_camera_body';
        const cam = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.03), mat(0x222, 0.5));
        cam.position.set(0.1, 0.2, 0.14);
        g.add(cam);
        return shadow(g);
    },
    acc_charm_rp() {
        const g = new THREE.Group();
        g.name = 'mod_acc_charm_rp';
        const charm = new THREE.Mesh(new THREE.TetrahedronGeometry(0.03), mat(0xaa6633, 0.5, 0.3));
        charm.position.set(0.15, -0.05, 0.12);
        g.add(charm);
        return shadow(g);
    },
};

// Register alias for legacy builders
Object.keys(PROCEDURAL).forEach((k) => {
    /* keep names stable */
});

function catalogRaw() {
    return modCatalog?.mods || AvatarManifest.mods?.() || {};
}

function slotsRaw() {
    return modCatalog?.slots || {};
}

/**
 * Resolve selected mod ids → conflict-free ordered list.
 * Exclusive slots: last selection wins (or first if preferFirst).
 */
export function resolveMods(selected = [], options = {}) {
    const catalog = catalogRaw();
    const slots = slotsRaw();
    const preferFirst = options.preferFirst === true;
    const bySlot = new Map();
    const stackable = [];

    for (const id of selected) {
        const spec = catalog[id];
        if (!spec) continue;
        const slotId = spec.slot || 'accessory';
        const slotDef = slots[slotId] || { exclusive: false };
        if (slotDef.exclusive) {
            if (preferFirst && bySlot.has(slotId)) continue;
            bySlot.set(slotId, id);
        } else {
            stackable.push(id);
        }
    }

    // Cap stackable accessories
    const accMax = slots.accessory?.max ?? 6;
    const accessories = stackable.filter((id) => (catalog[id]?.slot || 'accessory') === 'accessory').slice(0, accMax);
    const otherStack = stackable.filter((id) => (catalog[id]?.slot || 'accessory') !== 'accessory');

    const exclusiveIds = [...bySlot.values()];
    const ordered = [...exclusiveIds, ...otherStack, ...accessories];

    // Sort by slot order then label
    ordered.sort((a, b) => {
        const sa = slots[catalog[a]?.slot]?.order ?? 999;
        const sb = slots[catalog[b]?.slot]?.order ?? 999;
        return sa - sb;
    });

    return ordered;
}

function attachNamesFor(slotId, attach) {
    const key = attach || slotsRaw()[slotId]?.attach || 'torso';
    return ANCHOR_ALIASES[key] || AvatarManifest.attachPointNames?.(
        key === 'torso' ? 'torso_prop' : key === 'head' ? 'head_prop' : key
    ) || [key];
}

export const AvatarMod = {
    catalog() {
        return catalogRaw();
    },

    slots() {
        return slotsRaw();
    },

    categories() {
        return modCatalog?.categories || [];
    },

    presets() {
        return modCatalog?.presets || {};
    },

    list(filter = {}) {
        const cats = this.catalog();
        return Object.entries(cats)
            .map(([id, spec]) => ({ id, ...spec }))
            .filter((m) => {
                if (filter.category && m.category !== filter.category) return false;
                if (filter.slot && m.slot !== filter.slot) return false;
                if (filter.q) {
                    const q = filter.q.toLowerCase();
                    const hay = `${m.id} ${m.label} ${(m.tags || []).join(' ')}`.toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                return true;
            })
            .sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));
    },

    resolve: resolveMods,

    registerProcedural(id, builder) {
        if (typeof builder === 'function') PROCEDURAL[id] = builder;
    },

    /** Build SKIN UI HTML grouped by category */
    renderPickerHtml(selected = []) {
        const set = new Set(selected);
        const cats = this.categories();
        const byCat = new Map(cats.map((c) => [c.id, []]));
        byCat.set('_other', []);
        this.list().forEach((m) => {
            const key = byCat.has(m.category) ? m.category : '_other';
            byCat.get(key).push(m);
        });

        const sections = [];
        cats.forEach((c) => {
            const items = byCat.get(c.id) || [];
            if (!items.length) return;
            sections.push(`
                <details class="skin-mod-cat" open>
                    <summary>${c.label} <span class="skin-mod-count">${items.length}</span></summary>
                    <div class="skin-mod-cat-grid">
                        ${items.map((m) => `
                            <label class="skin-mod-opt" title="${(m.tags || []).join(', ')} · slot:${m.slot}">
                                <input type="checkbox" data-mod-id="${m.id}" ${set.has(m.id) ? 'checked' : ''}>
                                <span>${m.label || m.id}</span>
                            </label>
                        `).join('')}
                    </div>
                </details>
            `);
        });
        return sections.join('') || '<p class="insert-hint">No mods in catalog</p>';
    },

    renderPresetButtonsHtml() {
        return Object.entries(this.presets()).map(([id, p]) => `
            <button type="button" class="btn-sm skin-mod-preset" data-mod-preset="${id}" title="${(p.mods || []).join(', ')}">
                ${p.label || id}
            </button>
        `).join('');
    },

    applyPresetToUi(presetId) {
        const preset = this.presets()[presetId];
        if (!preset) return;
        const want = new Set(preset.mods || []);
        document.querySelectorAll('#skin-mod-list input[data-mod-id]').forEach((el) => {
            el.checked = want.has(el.dataset.modId);
        });
    },

    detachAll(group) {
        if (!group) return;
        const pieces = group.userData?._modPieces || [];
        pieces.forEach((piece) => {
            if (piece?.parent) piece.parent.remove(piece);
            disposeNode(piece);
        });
        const layer = group.userData?._modLayer;
        if (layer?.parent) layer.parent.remove(layer);
        disposeNode(layer);
        group.userData._modPieces = [];
        group.userData._modLayer = null;
        group.userData.mods = [];
        group.userData.modsResolved = [];
    },

    async apply(group, profile) {
        if (!group) return null;
        this.detachAll(group);

        const raw = Array.isArray(profile?.mods) ? profile.mods.filter(Boolean) : [];
        const mods = resolveMods(raw);
        if (!mods.length) return null;

        const catalog = this.catalog();
        const slots = this.slots();
        const pieces = [];

        for (const id of mods) {
            const spec = catalog[id] || { procedural: id, slot: 'accessory' };
            const slotId = spec.slot || 'accessory';
            const slotDef = slots[slotId] || {};
            const attach = spec.attach || slotDef.attach || 'torso';
            const builderName = spec.procedural || id;
            const builder = PROCEDURAL[builderName];

            let piece = null;
            if (spec.glb) {
                try {
                    const { GltfImport } = await import('./gltfImport.js');
                    const url = spec.glb.startsWith('http')
                        ? spec.glb
                        : AssetBundle.getUrl(`import/${String(spec.glb).replace(/^import\//, '')}`);
                    piece = await GltfImport.loadFromUrl(url);
                    piece.name = `mod_${id}`;
                } catch (e) {
                    console.warn('[avatar-mod] glb failed', id, e.message || e);
                }
            }
            if (!piece && builder) {
                piece = builder(profile);
            }
            if (!piece) {
                console.warn('[avatar-mod] missing builder', id);
                continue;
            }

            piece.userData.modId = id;
            piece.userData.avatarMod = true;
            piece.userData.modSlot = slotId;
            piece.userData.fpsHide = !!(spec.fpsHide ?? slotDef.fpsHide);

            const names = attachNamesFor(slotId, attach);
            const parent = findNamed(group, names) || group;

            // Placement hints by slot
            if (slotId === 'headwear' || slotId === 'face') {
                piece.position.y += slotId === 'face' ? 0.02 : 0.12;
            } else if (slotId === 'neck') {
                piece.position.y += 0.02;
            } else if (slotId === 'torso' || slotId === 'outer') {
                if (parent.name === 'torso') piece.position.y += 0.05;
            } else if (slotId === 'backpack') {
                /* builders already offset -Z */
            } else if (slotId === 'belt' || slotId === 'legs' || slotId === 'feet') {
                /* relative to hips */
            }

            parent.add(piece);
            pieces.push(piece);
        }

        group.userData._modPieces = pieces;
        group.userData.mods = [...raw];
        group.userData.modsResolved = [...mods];
        return pieces;
    },

    toggle(group, profile, modId, on) {
        const p = { ...profile, mods: [...(profile.mods || [])] };
        const has = p.mods.includes(modId);
        if (on && !has) p.mods.push(modId);
        if (!on && has) p.mods = p.mods.filter((m) => m !== modId);
        // Resolve exclusive slots so UI can re-sync
        p.mods = resolveMods(p.mods);
        return this.apply(group, p).then(() => p);
    },

    setFirstPersonVisible(group, showHead) {
        (group?.userData?._modPieces || []).forEach((piece) => {
            if (piece.userData?.fpsHide) piece.visible = showHead;
        });
    },
};

window.AvatarMod = AvatarMod;
