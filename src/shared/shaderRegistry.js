/**
 * Shader hook registry — agent-directed material effects without arbitrary GLSL eval.
 * Hooks are named, sandboxed tick callbacks on MeshStandardMaterial params.
 */

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function meshMaterials(mesh) {
    if (!mesh?.material) return [];
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function ensureDryState(mat) {
    if (!mat) return;
    mat.userData = mat.userData || {};
    if (mat.userData._hookDryRoughness == null && mat.roughness != null) {
        mat.userData._hookDryRoughness = mat.roughness;
    }
    if (mat.userData._hookDryMetalness == null && mat.metalness != null) {
        mat.userData._hookDryMetalness = mat.metalness;
    }
    if (mat.userData._hookDryEmissive == null && mat.emissive?.clone) {
        mat.userData._hookDryEmissive = mat.emissive.clone();
    }
    if (mat.userData._hookDryEmissiveIntensity == null) {
        mat.userData._hookDryEmissiveIntensity = mat.emissiveIntensity ?? 0;
    }
    if (mat.userData._hookDryColor == null && mat.color?.clone) {
        mat.userData._hookDryColor = mat.color.clone();
    }
}

function restoreDryState(mat) {
    if (!mat?.userData) return;
    if (mat.userData._hookDryRoughness != null) mat.roughness = mat.userData._hookDryRoughness;
    if (mat.userData._hookDryMetalness != null) mat.metalness = mat.userData._hookDryMetalness;
    if (mat.userData._hookDryEmissive && mat.emissive) mat.emissive.copy(mat.userData._hookDryEmissive);
    if (mat.userData._hookDryEmissiveIntensity != null) mat.emissiveIntensity = mat.userData._hookDryEmissiveIntensity;
    if (mat.userData._hookDryColor && mat.color) mat.color.copy(mat.userData._hookDryColor);
}

export const SHADER_HOOKS = [
    {
        id: 'wet_surface_boost',
        label: 'Rain wetness amplifier',
        agentHint: 'Exterior floors — stacks with WeatherSystem rain lerp.',
        onApply(mesh) {
            meshMaterials(mesh).forEach(ensureDryState);
        },
        tick(mesh, ctx) {
            const rain = ctx.rainIntensity ?? 0;
            const boost = mesh.userData?.shaderIntensity ?? 1;
            meshMaterials(mesh).forEach((m) => {
                if (!m || m.userData?._hookDryRoughness == null) return;
                const target = Math.max(0.38, m.userData._hookDryRoughness - 0.18);
                m.roughness = lerp(m.userData._hookDryRoughness, target, rain * boost);
            });
        },
    },
    {
        id: 'emissive_pulse',
        label: 'Emissive pulse (signs, terminals)',
        agentHint: 'Neon / kiosk — pairs with weatherMarquee for rain dampen.',
        onApply(mesh) {
            meshMaterials(mesh).forEach(ensureDryState);
        },
        tick(mesh, ctx) {
            const rain = ctx.rainIntensity ?? 0;
            const pulse = 0.85 + Math.sin(ctx.now * 0.003) * 0.15;
            const rainMul = mesh.userData?.weatherMarquee ? 1 - rain * 0.35 : 1;
            meshMaterials(mesh).forEach((m) => {
                if (!m || m.userData?._hookDryEmissiveIntensity == null) return;
                m.emissiveIntensity = m.userData._hookDryEmissiveIntensity * pulse * rainMul;
            });
        },
    },
    {
        id: 'dust_overlay',
        label: 'Dust overlay (dry wear)',
        agentHint: 'Works with userData.dustExposure — mutes when raining.',
        onApply(mesh) {
            meshMaterials(mesh).forEach(ensureDryState);
        },
        tick(mesh, ctx) {
            const dry = Math.max(0, 1 - (ctx.rainIntensity ?? 0));
            const exposure = Math.max(0, Math.min(1, mesh.userData?.dustExposure ?? 0.6));
            const t = dry * exposure;
            meshMaterials(mesh).forEach((m) => {
                if (!m || m.userData?._hookDryRoughness == null) return;
                m.roughness = lerp(m.userData._hookDryRoughness, Math.min(1, m.userData._hookDryRoughness + 0.1), t);
                if (m.color && m.userData._hookDryColor) {
                    m.color.copy(m.userData._hookDryColor).multiplyScalar(lerp(1, 0.9, t));
                }
            });
        },
    },
    {
        id: 'snow_freshen',
        label: 'Snow freshen (cap highlight)',
        agentHint: 'Pairs with userData.snowCap — brightens albedo when rain low.',
        onApply(mesh) {
            meshMaterials(mesh).forEach(ensureDryState);
        },
        tick(mesh, ctx) {
            const snowT = Math.max(0, 0.4 - (ctx.rainIntensity ?? 0) * 0.55);
            const cap = Math.max(0, Math.min(1, mesh.userData?.snowCap ?? 0.5));
            const t = snowT * cap;
            meshMaterials(mesh).forEach((m) => {
                if (!m || m.userData?._hookDryColor == null || !m.color) return;
                m.color.r = lerp(m.userData._hookDryColor.r, 0.93, t * 0.45);
                m.color.g = lerp(m.userData._hookDryColor.g, 0.95, t * 0.45);
                m.color.b = lerp(m.userData._hookDryColor.b, 0.97, t * 0.45);
            });
        },
    },
    {
        id: 'heat_shimmer',
        label: 'Heat shimmer (emissive flicker)',
        agentHint: 'Industrial vents, coils — subtle emissive variance.',
        onApply(mesh) {
            meshMaterials(mesh).forEach(ensureDryState);
        },
        tick(mesh, ctx) {
            const flicker = 0.92 + Math.sin(ctx.now * 0.012 + mesh.id) * 0.08;
            meshMaterials(mesh).forEach((m) => {
                if (!m || m.userData?._hookDryEmissiveIntensity == null) return;
                m.emissiveIntensity = m.userData._hookDryEmissiveIntensity * flicker;
            });
        },
    },
];

const HOOK_MAP = new Map(SHADER_HOOKS.map((h) => [h.id, h]));

export function getShaderHook(id) {
    return HOOK_MAP.get(id) || null;
}

export function getShaderHookPromptBlock() {
    return `
THRESHOLD SHADER HOOKS (set userData.shaderHook = id — no raw GLSL):
${SHADER_HOOKS.map((h) => `- ${h.id}: ${h.label} — ${h.agentHint}`).join('\n')}
Apply: ShaderRegistry.applyHook(mesh, 'wet_surface_boost') after MaterialPresets.
Optional userData.shaderIntensity = 0–1.5 to scale effect.`.trim();
}

export const ShaderRegistry = {
    _targets: [],

    init() {
        this._collectFromScene();
    },

    registerMesh(mesh) {
        if (!mesh?.isMesh || !mesh.userData?.shaderHook) return;
        if (!this._targets.includes(mesh)) this._targets.push(mesh);
        const hook = getShaderHook(mesh.userData.shaderHook);
        hook?.onApply?.(mesh);
    },

    applyHook(mesh, hookId, { intensity } = {}) {
        if (!mesh) return null;
        const hook = getShaderHook(hookId);
        if (!hook) return null;
        mesh.userData = mesh.userData || {};
        mesh.userData.shaderHook = hookId;
        if (intensity != null) mesh.userData.shaderIntensity = intensity;
        hook.onApply?.(mesh);
        this.registerMesh(mesh);
        window.WeatherSystem?.registerMesh?.(mesh);
        return hook;
    },

    removeHook(mesh) {
        meshMaterials(mesh).forEach(restoreDryState);
        if (mesh?.userData) {
            delete mesh.userData.shaderHook;
            delete mesh.userData.shaderIntensity;
        }
        this._targets = this._targets.filter((m) => m !== mesh);
    },

    _collectFromScene() {
        this._targets = [];
        const objects = window.State?.objects || [];
        const visit = (node) => {
            if (node?.isMesh && node.userData?.shaderHook) this.registerMesh(node);
        };
        objects.forEach((o) => {
            visit(o);
            o.traverse?.(visit);
        });
    },

    tick(dt = 0.016) {
        if (window.State?.isPaused) return;
        const ctx = {
            dt,
            now: performance.now(),
            rainIntensity: window.WeatherSystem?.getIntensity?.() ?? 0,
        };
        const Vis = window.VisibilitySystem;
        this._targets = this._targets.filter((mesh) => mesh.parent);
        this._targets.forEach((mesh) => {
            // E3: skip off-screen shader hook ticks
            if (Vis?.shouldProcessEnv && !Vis.shouldProcessEnv(mesh)) return;
            const hook = getShaderHook(mesh.userData?.shaderHook);
            hook?.tick?.(mesh, ctx);
        });
    },

    collectExportEntries() {
        return this._targets.map((mesh) => ({
            name: mesh.userData?.name || mesh.userData?.id || 'mesh',
            shaderHook: mesh.userData?.shaderHook,
            shaderIntensity: mesh.userData?.shaderIntensity,
            materialPreset: mesh.userData?.materialPreset,
        })).filter((e) => e.shaderHook);
    },
};

window.ShaderRegistry = ShaderRegistry;
window.SHADER_HOOKS = SHADER_HOOKS;