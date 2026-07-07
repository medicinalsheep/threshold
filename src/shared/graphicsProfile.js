import { ViewPrefs } from './viewPrefs.js';

/** Device tiers — all use Hyper PBR (render mode 4). Scale quality, not retro shaders. */
export const GRAPHICS_TIERS = {
    compatibility: {
        id: 'compatibility',
        label: 'Lite',
        description: 'PBR realistic · no water · 512px textures — old phones & max reach',
        renderMode: 4,
        env: { waterEnabled: false, atmosphereEnabled: false, fogDensity: 0.02 },
        physicsIterations: 8,
        pixelRatioCap: 1,
        shadowMapSize: 1024,
        bloomStrength: 0.28,
        waterTexSize: 512,
        textureMax: 512,
    },
    balanced: {
        id: 'balanced',
        label: 'Mobile',
        description: 'PBR realistic · atmosphere · lighter bloom — phones & tablets',
        renderMode: 4,
        env: { waterEnabled: false, atmosphereEnabled: true, fogDensity: 0.016 },
        physicsIterations: 12,
        pixelRatioCap: 1.5,
        shadowMapSize: 2048,
        bloomStrength: 0.38,
        waterTexSize: 512,
        textureMax: 1024,
    },
    realistic: {
        id: 'realistic',
        label: 'Realistic',
        description: 'Full PBR · water · bloom · 2K textures — desktop default',
        renderMode: 4,
        env: { waterEnabled: true, atmosphereEnabled: true, fogDensity: 0.015 },
        physicsIterations: 15,
        pixelRatioCap: null,
        shadowMapSize: 2048,
        bloomStrength: 0.46,
        waterTexSize: 1024,
        textureMax: 2048,
    },
    ultra: {
        id: 'ultra',
        label: 'Ultra',
        description: 'PBR max · sharp shadows · 4K textures — high-end desktop',
        renderMode: 4,
        env: { waterEnabled: true, atmosphereEnabled: true, fogDensity: 0.012 },
        physicsIterations: 20,
        pixelRatioCap: 2,
        shadowMapSize: 4096,
        bloomStrength: 0.56,
        waterTexSize: 1024,
        textureMax: 4096,
    },
    custom: {
        id: 'custom',
        label: 'Custom',
        description: 'Manual env / retro style overrides',
        renderMode: null,
        env: null,
        physicsIterations: null,
        pixelRatioCap: null,
        shadowMapSize: null,
        bloomStrength: null,
        waterTexSize: null,
        textureMax: null,
    },
};

const TIER_ORDER = ['compatibility', 'balanced', 'realistic', 'ultra'];

function isTouchDevice() {
    return window.matchMedia('(pointer: coarse)').matches;
}

function probeWebGL() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl', { powerPreference: 'high-performance' })
            || canvas.getContext('experimental-webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        const renderer = ext && gl
            ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '')
            : '';
        const vendor = ext && gl
            ? String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) || '')
            : '';
        return { gl: !!gl, renderer, vendor };
    } catch {
        return { gl: false, renderer: '', vendor: '' };
    }
}

function probeGpuTier() {
    let tier = 2;
    const { gl, renderer: raw } = probeWebGL();
    if (!gl) return 0;
    const renderer = raw.toLowerCase();
    if (/swiftshader|llvmpipe|software|basic render/.test(renderer)) tier = 0;
    else if (/intel|mesa|hd graphics|uhd graphics/.test(renderer)) tier = 1;
    else if (/apple m\d|nvidia|geforce|rtx|radeon rx|rx \d|arc a\d/.test(renderer)) tier = 3;
    else if (/apple gpu|adreno 6|adreno 7|mali-g7/.test(renderer)) tier = 2;
    return tier;
}

export const GraphicsProfile = {
    detect() {
        const cores = navigator.hardwareConcurrency || 4;
        const memoryGb = navigator.deviceMemory || 4;
        const gpuTier = probeGpuTier();
        const touch = isTouchDevice();
        const mobileUa = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

        if (gpuTier <= 0 || (cores <= 2 && memoryGb <= 2)) return 'compatibility';
        if (touch || mobileUa || cores <= 4 || memoryGb <= 4 || gpuTier <= 1) return 'balanced';
        if (!touch && cores >= 8 && memoryGb >= 8 && gpuTier >= 3) return 'ultra';
        return 'realistic';
    },

    getTier(id) {
        return GRAPHICS_TIERS[id] || GRAPHICS_TIERS.realistic;
    },

    listTiers() {
        return TIER_ORDER.map((id) => GRAPHICS_TIERS[id]);
    },

    getSuggestedLabel() {
        const id = window.State?.graphicsDetectedTier || this.detect();
        return this.getTier(id).label;
    },

    bootstrap() {
        const State = window.State;
        if (!State) return null;
        State.graphicsDetectedTier = this.detect();
        const prompted = ViewPrefs.get('graphicsTierPrompted', false);
        const saved = ViewPrefs.get('graphicsTier', null);
        if (prompted && saved) {
            State.graphicsTier = saved;
            if (saved !== 'custom') this.apply(saved, { silent: true, persist: false });
            else this.syncUi();
            return saved;
        }
        State.graphicsTier = State.graphicsDetectedTier;
        return State.graphicsDetectedTier;
    },

    markCustom() {
        const State = window.State;
        if (!State) return;
        State.graphicsTier = 'custom';
        ViewPrefs.set('graphicsTier', 'custom');
        this.syncUi();
    },

    apply(tierId, options = {}) {
        const preset = GRAPHICS_TIERS[tierId];
        const State = window.State;
        const Engine = window.Engine;
        const Environment = window.Environment;
        const Physics = window.Physics;
        if (!preset || !State || preset.id === 'custom') return false;

        State.graphicsTier = tierId;
        if (preset.env) {
            State.env.waterEnabled = preset.env.waterEnabled;
            State.env.atmosphereEnabled = preset.env.atmosphereEnabled;
            State.env.fogDensity = preset.env.fogDensity;
        }

        if (typeof preset.renderMode === 'number' && Engine?.setRenderMode) {
            Engine.setRenderMode(preset.renderMode);
        }

        if (Environment) {
            Environment.setFog(State.env.fogDensity);
            const waterOn = !!State.env.waterEnabled;
            if (waterOn !== !!Environment.waterReflector) {
                if (waterOn) Environment.createWater();
                else Environment.removeWater();
            }
            const waterBtn = document.getElementById('env-water-toggle');
            if (waterBtn) {
                waterBtn.textContent = waterOn ? 'ON' : 'OFF';
                waterBtn.classList.toggle('active', waterOn);
            }
            if (Engine?.groundPlane) Engine.groundPlane.visible = !waterOn;

            if (State.env.atmosphereEnabled) {
                if (!Environment.hemiLight && Engine?.scene) {
                    const THREE = window.THREE;
                    if (THREE) Environment.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x1a2a12, 0.55);
                    Engine.scene.add(Environment.hemiLight);
                }
                if (Environment.hemiLight) Environment.hemiLight.visible = true;
            } else if (Environment.hemiLight) {
                Environment.hemiLight.visible = false;
            }
            const atmoBtn = document.getElementById('env-atmo-toggle');
            if (atmoBtn) {
                atmoBtn.textContent = State.env.atmosphereEnabled ? 'ON' : 'OFF';
                atmoBtn.classList.toggle('active', State.env.atmosphereEnabled);
            }
        }

        if (Physics?.world && preset.physicsIterations) {
            Physics.world.solver.iterations = preset.physicsIterations;
        }

        if (Engine?.renderer) {
            const cap = preset.pixelRatioCap;
            const dpr = window.devicePixelRatio || 1;
            const ratio = cap == null ? dpr : Math.min(dpr, cap);
            Engine.renderer.setPixelRatio(ratio);
        }

        if (Environment?.sunLight && preset.shadowMapSize) {
            Environment.sunLight.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
        }

        if (Engine?.bloomPass && preset.bloomStrength != null && State.renderMode === 4) {
            Engine.bloomPass.strength = preset.bloomStrength;
        }

        this.syncUi();

        if (options.persist !== false) {
            ViewPrefs.set('graphicsTier', tierId);
            ViewPrefs.set('graphicsTierPrompted', true);
        }

        window.TextureHilod?.refreshAll?.();

        if (!options.silent) {
            window.UI?.status?.(`Graphics: ${preset.label} — ${preset.description.split(' — ')[0]}`);
        }
        return true;
    },

    syncUi() {
        const State = window.State;
        const tierSelect = document.getElementById('env-graphics-tier');
        const info = document.getElementById('env-graphics-info');
        const tierId = State?.graphicsTier || 'realistic';
        const tier = this.getTier(tierId);
        if (tierSelect) tierSelect.value = tierId;
        if (info) {
            const detected = State?.graphicsDetectedTier
                ? `Detected: ${this.getTier(State.graphicsDetectedTier).label}. `
                : '';
            info.textContent = `${detected}${tier.description}`;
        }
        const fog = document.getElementById('env-fog');
        if (fog && State?.env) fog.value = String(State.env.fogDensity);
    },

    getPromptBlock() {
        return this.listTiers().map((t) =>
            `- ${t.id} (${t.label}): ${t.description}`
        ).join('\n');
    },

    getCompatReport() {
        const { gl, renderer, vendor } = probeWebGL();
        const tier = probeGpuTier();
        const software = /swiftshader|llvmpipe|software|basic render/i.test(renderer);
        const discrete = /nvidia|geforce|rtx|radeon rx|arc a\d/i.test(renderer);
        return {
            webgl: gl,
            renderer: renderer || 'unknown',
            vendor: vendor || 'unknown',
            gpuTier: tier,
            softwareFallback: software,
            discreteGpu: discrete,
            usesGpu: gl && !software,
            powerPreference: 'high-performance',
        };
    },

    exportSnapshot() {
        const State = window.State;
        const tierId = State?.graphicsTier || null;
        const tier = tierId ? this.getTier(tierId) : null;
        return {
            tier: tierId,
            detectedTier: State?.graphicsDetectedTier || null,
            renderMode: State?.renderMode ?? 4,
            textureMax: tier?.textureMax ?? null,
            env: State?.env ? { ...State.env } : null,
            compat: this.getCompatReport(),
        };
    },

    applyFromSync(snapshot = {}) {
        const State = window.State;
        const Environment = window.Environment;
        if (snapshot.tier && snapshot.tier !== 'custom') {
            this.apply(snapshot.tier, { silent: true, persist: false });
            if (snapshot.env?.timeOfDay != null && Environment) {
                Environment.setTimeOfDay(snapshot.env.timeOfDay);
            }
            return;
        }
        if (snapshot.env && State) {
            Object.assign(State.env, snapshot.env);
            if (Environment) {
                if (snapshot.env.timeOfDay != null) Environment.setTimeOfDay(snapshot.env.timeOfDay);
                Environment.setFog(snapshot.env.fogDensity ?? State.env.fogDensity);
            }
        }
        if (typeof snapshot.renderMode === 'number') window.Engine?.setRenderMode?.(snapshot.renderMode);
        if (snapshot.tier && State) State.graphicsTier = snapshot.tier;
        this.syncUi();
    },
};

window.GraphicsProfile = GraphicsProfile;