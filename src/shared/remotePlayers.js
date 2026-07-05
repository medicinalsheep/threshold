import * as THREE from 'three';

const COLORS = [0x39ff14, 0x4488ff, 0xff6644, 0xffcc00, 0xcc66ff, 0x66ffcc];

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
            if (!entry) entry = this._createMarker(k, names.get(k) || k, pos.mode);
            const yOff = pos.mode === 'fly' ? 0.2 : 0.9;
            entry.group.position.lerp(
                new THREE.Vector3(pos.x, pos.y + yOff, pos.z),
                0.35
            );
            if (Number.isFinite(pos.rotY)) entry.group.rotation.y = pos.rotY;
        });

        this.markers.forEach((entry, key) => {
            if (!active.has(key)) this._removeMarker(key);
        });
    },

    _removeMarker(key) {
        const Engine = window.Engine;
        const entry = this.markers.get(key);
        if (entry) {
            Engine?.scene?.remove(entry.group);
            this.markers.delete(key);
        }
    },

    _createMarker(key, label, mode = 'walk') {
        const Engine = window.Engine;
        const hue = COLORS[key.charCodeAt(0) % COLORS.length];
        const group = new THREE.Group();
        group.name = `remote_player_${key}`;

        const body = mode === 'fly'
            ? new THREE.Mesh(
                new THREE.OctahedronGeometry(0.28, 0),
                new THREE.MeshStandardMaterial({ color: hue, emissive: hue, emissiveIntensity: 0.5 })
            )
            : new THREE.Mesh(
                new THREE.CapsuleGeometry(0.22, 0.55, 4, 8),
                new THREE.MeshStandardMaterial({
                    color: hue,
                    emissive: hue,
                    emissiveIntensity: 0.35,
                    roughness: 0.45,
                })
            );
        body.position.y = mode === 'fly' ? 0.28 : 0.55;
        group.add(body);

        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.35, 0.42, 24),
            new THREE.MeshBasicMaterial({ color: hue, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);

        group.userData = { isRemotePlayer: true, playerKey: key, label };
        Engine.scene.add(group);
        const entry = { group, label };
        this.markers.set(key, entry);
        return entry;
    },

    clear() {
        const Engine = window.Engine;
        this.markers.forEach((entry) => Engine?.scene?.remove(entry.group));
        this.markers.clear();
    },
};

window.RemotePlayers = RemotePlayers;