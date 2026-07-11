/**
 * Dynamic audio zones — meshes with userData.audioZone drive spatial ambient loops.
 */

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function dist3(a, b) {
    const dx = a.x - b.x;
    const dy = (a.y ?? 0) - (b.y ?? 0);
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export const AUDIO_ZONE_TYPES = {
    interior_warm: {
        clipId: 'starter_interior_coffee_murmur',
        volume: 0.32,
        radius: 8,
        rainDuck: 0.5,
        label: 'Interior warm',
    },
    interior_radio: {
        clipId: 'starter_interior_radio_chatter',
        volume: 0.28,
        radius: 5,
        rainDuck: 0.45,
        label: 'Interior radio',
    },
    exterior_open: {
        clipId: 'starter_amb_wind',
        volume: 0.22,
        radius: 22,
        rainDuck: 0.35,
        label: 'Exterior open wind',
    },
    industrial_hum: {
        clipId: 'starter_amb_power_hum',
        volume: 0.16,
        radius: 12,
        rainDuck: 0.2,
        label: 'Industrial hum',
    },
    creek_near: {
        clipId: 'starter_amb_creek',
        volume: 0.26,
        radius: 6,
        rainDuck: 0.08,
        label: 'Creek / water edge',
    },
    highway_edge: {
        clipId: 'starter_amb_highway',
        volume: 0.24,
        radius: 10,
        rainDuck: 0.15,
        label: 'Highway edge',
    },
};

function zoneVol(zone, pos) {
    const d = dist3(pos, zone.pos);
    if (d >= zone.radius) return 0;
    const t = 1 - d / zone.radius;
    return zone.volume * t * t;
}

export const AudioZoneSystem = {
    _zones: [],
    _handles: new Map(),
    _starting: new Set(),
    _active: false,

    init() {
        this._collectFromScene();
    },

    registerMesh(mesh) {
        const zoneId = mesh?.userData?.audioZone;
        if (!zoneId || !AUDIO_ZONE_TYPES[zoneId]) return;
        const type = AUDIO_ZONE_TYPES[zoneId];
        const radius = mesh.userData.audioZoneRadius || type.radius;
        const entry = {
            mesh,
            id: `${zoneId}_${mesh.uuid}`,
            zoneId,
            clipId: type.clipId,
            volume: mesh.userData.audioZoneVolume ?? type.volume,
            radius,
            rainDuck: type.rainDuck ?? 0.25,
            pos: mesh.position,
        };
        const idx = this._zones.findIndex((z) => z.mesh === mesh);
        if (idx >= 0) this._zones[idx] = entry;
        else this._zones.push(entry);
        if (this._active) void this._ensureHandle(entry);
    },

    _collectFromScene() {
        this._zones = [];
        const objects = window.State?.objects || [];
        const visit = (node) => {
            if (node?.isMesh && node.userData?.audioZone) this.registerMesh(node);
        };
        objects.forEach((o) => {
            visit(o);
            o.traverse?.(visit);
        });
    },

    _listenerPos() {
        const PC = window.PlayerController;
        if (PC?.spawned && PC.group) return PC.group.position;
        return window.Engine?.camera?.position;
    },

    async start() {
        if (this._active) return;
        this._active = true;
        this.init();
        for (const zone of this._zones) {
            await this._ensureHandle(zone);
            await delay(120);
        }
    },

    stop() {
        this._active = false;
        this._handles.forEach((h) => h?.stop?.());
        this._handles.clear();
        this._starting.clear();
    },

    async _ensureHandle(zone) {
        if (this._handles.has(zone.id) || this._starting.has(zone.id)) return;
        const AudioSys = window.AudioSys;
        if (!AudioSys?.playClipLoop) return;
        this._starting.add(zone.id);
        try {
            const handle = await AudioSys.playClipLoop(zone.clipId, 0);
            if (this._active) this._handles.set(zone.id, handle);
            else handle?.stop?.();
        } finally {
            this._starting.delete(zone.id);
        }
    },

    tick(_dt) {
        if (!this._active || window.State?.isPaused) return;
        const pos = this._listenerPos();
        if (!pos) return;

        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;

        this._zones.forEach((zone) => {
            if (zone.mesh?.position) zone.pos = zone.mesh.position;
            // E3: off-screen far zone mesh — don't spin up handles; fade existing to 0
            const Vis = window.VisibilitySystem;
            if (zone.mesh && Vis?.shouldProcessEnv && !Vis.shouldProcessEnv(zone.mesh)) {
                const handle = this._handles.get(zone.id);
                if (handle?.setVolume) {
                    const cur = handle.gain?.gain?.value ?? 1;
                    if (cur > 0.02) handle.setVolume(0);
                }
                return;
            }
            const handle = this._handles.get(zone.id);
            if (!handle) {
                void this._ensureHandle(zone);
                return;
            }
            const rainMul = 1 - rain * zone.rainDuck;
            const vol = zoneVol(zone, pos) * rainMul;
            handle.setVolume?.(vol);
        });
    },

    collectExportEntries() {
        return this._zones.map((z) => ({
            zoneId: z.zoneId,
            clipId: z.clipId,
            radius: z.radius,
            volume: z.volume,
            name: z.mesh?.userData?.name,
            pos: z.pos ? { x: z.pos.x, y: z.pos.y, z: z.pos.z } : null,
        }));
    },
};

window.AudioZoneSystem = AudioZoneSystem;