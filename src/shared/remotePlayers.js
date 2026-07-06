import * as THREE from 'three';
import { HumanMesh } from '../engine/humanMesh.js';
import { AvatarComposer } from './avatarComposer.js';
import { profileFromLegacyAppearance, normalizeProfile } from './appearanceProfile.js';

const COLORS = [0x39ff14, 0x4488ff, 0xff6644, 0xffcc00, 0xcc66ff, 0x66ffcc];

function barColor(value, invert = false) {
    const v = invert ? 100 - value : value;
    if (v < 18) return '#e85a5a';
    if (v < 35) return '#d4a84a';
    return '#6ecf96';
}

function createVitalsPill() {
    const canvas = document.createElement('canvas');
    canvas.width = 108;
    canvas.height = 28;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthTest: false,
        depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.05, 0.28, 1);
    sprite.renderOrder = 12;

    const draw = (vitals = []) => {
        const [hp = 0, food = 0, water = 0] = vitals;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(6, 10, 14, 0.82)';
        ctx.strokeStyle = 'rgba(120, 180, 200, 0.55)';
        ctx.lineWidth = 1.5;
        roundRect(ctx, 2, 2, canvas.width - 4, canvas.height - 4, 6);
        ctx.fill();
        ctx.stroke();

        const segments = [
            { label: 'HP', value: hp, color: barColor(hp) },
            { label: 'F', value: food, color: barColor(food) },
            { label: 'W', value: water, color: barColor(water) },
        ];
        const pad = 8;
        const gap = 4;
        const segW = (canvas.width - pad * 2 - gap * 2) / 3;
        segments.forEach((seg, i) => {
            const x = pad + i * (segW + gap);
            const y = 8;
            const h = 12;
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            roundRect(ctx, x, y, segW, h, 3);
            ctx.fill();
            const fillW = Math.max(2, (segW - 2) * clamp01(seg.value / 100));
            ctx.fillStyle = seg.color;
            roundRect(ctx, x + 1, y + 1, fillW, h - 2, 2);
            ctx.fill();
            ctx.fillStyle = '#b8c8d0';
            ctx.font = 'bold 8px monospace';
            ctx.fillText(seg.label, x + 2, y - 1);
        });
        tex.needsUpdate = true;
    };

    return { sprite, draw };
}

function clamp01(v) {
    return Math.max(0, Math.min(1, v));
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

export const RemotePlayers = {
    markers: new Map(),

    syncAvatars(avatars = {}, roster = []) {
        const positions = {};
        Object.entries(avatars || {}).forEach(([key, av]) => {
            if (av && Number.isFinite(av.x)) {
                positions[key] = {
                    x: av.x,
                    y: av.y,
                    z: av.z,
                    mode: av.mode,
                    vehicleId: av.vehicleId,
                    rotY: av.rotY,
                    appearance: av.appearance,
                    vitals: av.v,
                };
            }
        });
        this.sync(positions, roster);
    },

    sync(positions = {}, roster = []) {
        const Engine = window.Engine;
        const Session = window.Session;
        const net = window.Network;
        if (!Engine?.scene || !Session || net?.mode === 'solo') {
            this.clear();
            return;
        }

        const selfKey = String(Session.playerKey || '').toUpperCase();
        const names = new Map();
        (roster || []).forEach((p) => names.set(String(p.key).toUpperCase(), p.name || p.key));

        const active = new Set();
        Object.entries(positions || {}).forEach(([key, pos]) => {
            const k = String(key).toUpperCase();
            if (k === selfKey || !pos || !Number.isFinite(pos.x)) return;
            if (pos.mode === 'vehicle') {
                this._removeMarker(k);
                return;
            }
            active.add(k);
            let entry = this.markers.get(k);
            if (!entry) entry = this._createMarker(k, names.get(k) || k, pos.mode, pos.appearance);
            const yOff = pos.mode === 'fly' ? 1.2 : 0;
            entry.group.position.lerp(
                new THREE.Vector3(pos.x, pos.y + yOff, pos.z),
                0.35
            );
            if (Number.isFinite(pos.rotY)) entry.group.rotation.y = pos.rotY;
            this._updateVitalsPill(entry, pos.vitals, pos.mode);
        });

        this.markers.forEach((entry, key) => {
            if (!active.has(key)) this._removeMarker(key);
        });
    },

    _updateVitalsPill(entry, vitals, mode = 'walk') {
        if (!Array.isArray(vitals) || vitals.length < 3) {
            if (entry.vitalsSprite) entry.vitalsSprite.visible = false;
            return;
        }
        if (!entry.vitalsPill) {
            const pill = createVitalsPill();
            pill.sprite.position.y = mode === 'fly' ? 0.82 : 1.92;
            entry.group.add(pill.sprite);
            entry.vitalsPill = pill;
            entry.vitalsSprite = pill.sprite;
        }
        entry.vitalsSprite.visible = true;
        entry.vitalsPill.draw(vitals);
    },

    _removeMarker(key) {
        const Engine = window.Engine;
        const entry = this.markers.get(key);
        if (entry) {
            Engine?.scene?.remove(entry.group);
            entry.vitalsPill?.sprite?.material?.map?.dispose?.();
            entry.vitalsPill?.sprite?.material?.dispose?.();
            this.markers.delete(key);
        }
    },

    _createMarker(key, label, mode = 'walk', appearance = null) {
        const Engine = window.Engine;
        const hue = COLORS[key.charCodeAt(0) % COLORS.length];
        const group = new THREE.Group();
        group.name = `remote_player_${key}`;

        if (mode === 'fly') {
            const body = new THREE.Mesh(
                new THREE.OctahedronGeometry(0.28, 0),
                new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 0.5 })
            );
            body.position.y = 0.28;
            group.add(body);
        } else {
            const profile = appearance
                ? normalizeProfile(appearance)
                : profileFromLegacyAppearance({
                    bodyColor: (hue & 0xfefefe) >> 1,
                    skinColor: 0xe8b896,
                    pantsColor: 0x232830,
                });
            const avatar = HumanMesh.build(window.AppearanceProfile?.profileToMeshOpts?.(profile) || {
                bodyColor: (hue & 0xfefefe) >> 1,
                skinColor: 0xe8b896,
                pantsColor: 0x232830,
            });
            group.add(avatar);
            void AvatarComposer.apply(avatar, profile);
        }

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.35, 0.42, 24),
            new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        group.userData = { isRemotePlayer: true, playerKey: key, label, isHuman: mode !== 'fly' };
        Engine.scene.add(group);
        const entry = { group, label };
        this.markers.set(key, entry);
        return entry;
    },

    clear() {
        const Engine = window.Engine;
        this.markers.forEach((entry) => {
            entry.vitalsPill?.sprite?.material?.map?.dispose?.();
            entry.vitalsPill?.sprite?.material?.dispose?.();
            Engine?.scene?.remove(entry.group);
        });
        this.markers.clear();
    },
};

window.RemotePlayers = RemotePlayers;