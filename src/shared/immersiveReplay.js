/**
 * Immersive replay — re-apply weather, audio zones, shader hooks/graphs after sync or manifest load.
 */

function visitSceneMeshes(fn) {
    const objects = window.State?.objects || [];
    objects.forEach((root) => {
        const walk = (node) => {
            if (node?.isMesh) fn(node, root);
            node?.traverse?.((c) => {
                if (c.isMesh) fn(c, root);
            });
        };
        walk(root);
    });
}

function meshIndexByName() {
    const map = new Map();
    visitSceneMeshes((mesh) => {
        const name = mesh.userData?.name || mesh.userData?.id;
        if (name && !map.has(name)) map.set(name, mesh);
    });
    return map;
}

export function captureImmersiveBlock(prefs = {}) {
    const p = {
        replayWeather: prefs.replayWeather !== false,
        bundleAudioZones: prefs.bundleAudioZones !== false,
        bundleShaderGraphs: prefs.bundleShaderGraphs !== false,
    };
    return {
        weather: p.replayWeather ? (window.WeatherSystem?.captureState?.() || null) : null,
        audioZones: p.bundleAudioZones
            ? (window.AudioZoneSystem?.collectExportEntries?.() || [])
            : [],
        shaderHooks: p.bundleShaderGraphs
            ? (window.ShaderRegistry?.collectExportEntries?.() || [])
            : [],
        shaderGraphs: p.bundleShaderGraphs
            ? (window.ShaderNodeGraph?.collectExportEntries?.() || [])
            : [],
        prefs: p,
    };
}

export const ImmersiveReplay = {
    _lastApplied: null,

    tick(dt = 0.016) {
        if (window.State?.isPaused) return;
        window.ShaderRegistry?.tick?.(dt);
        window.ShaderNodeGraph?.tick?.(dt);
        if (window.AudioZoneSystem?._active) {
            window.AudioZoneSystem?.tick?.(dt);
        }
    },

    reapplySceneMeshes() {
        visitSceneMeshes((mesh) => {
            const ud = mesh.userData || {};
            if (ud.materialPreset && window.MaterialPresets?.applyMaterialPreset) {
                window.MaterialPresets.applyMaterialPreset(mesh, ud.materialPreset);
                return;
            }
            if (ud.shaderHook) window.ShaderRegistry?.applyHook?.(mesh, ud.shaderHook, {
                intensity: ud.shaderIntensity,
            });
            if (ud.shaderGraph) window.ShaderNodeGraph?.applyGraph?.(mesh, ud.shaderGraph);
            else if (ud.shaderNodes?.length) {
                window.ShaderNodeGraph?.applyGraph?.(mesh, null, { nodes: ud.shaderNodes });
            }
            if (ud.audioZone) window.AudioZoneSystem?.registerMesh?.(mesh);
            window.WeatherSystem?.registerMesh?.(mesh);
        });

        window.ShaderRegistry?.init?.();
        window.ShaderNodeGraph?.init?.();
        window.AudioZoneSystem?.init?.();
    },

    _applyManifestFallback(immersive = {}) {
        if (!immersive || immersive.prefs?.bundleAudioZones === false) return;
        const byName = meshIndexByName();

        (immersive.audioZones || []).forEach((entry) => {
            const mesh = byName.get(entry.name);
            if (!mesh) return;
            mesh.userData = mesh.userData || {};
            if (!mesh.userData.audioZone) {
                mesh.userData.audioZone = entry.zoneId;
                if (entry.radius) mesh.userData.audioZoneRadius = entry.radius;
                if (entry.volume != null) mesh.userData.audioZoneVolume = entry.volume;
                window.AudioZoneSystem?.registerMesh?.(mesh);
            }
        });

        if (immersive.prefs?.bundleShaderGraphs === false) return;

        (immersive.shaderHooks || []).forEach((entry) => {
            const mesh = byName.get(entry.name);
            if (!mesh?.userData?.shaderHook && entry.shaderHook) {
                window.ShaderRegistry?.applyHook?.(mesh, entry.shaderHook, {
                    intensity: entry.shaderIntensity,
                });
            }
        });

        (immersive.shaderGraphs || []).forEach((entry) => {
            const mesh = byName.get(entry.name);
            if (!mesh) return;
            if (mesh.userData?.shaderGraph || mesh.userData?.shaderNodes?.length) return;
            if (entry.shaderGraph) {
                window.ShaderNodeGraph?.applyGraph?.(mesh, entry.shaderGraph);
            } else if (entry.shaderNodes?.length) {
                window.ShaderNodeGraph?.applyGraph?.(mesh, null, { nodes: entry.shaderNodes });
            }
        });
    },

    async reapplyFromState(state = {}) {
        const immersive = state.immersive || null;
        const prefs = immersive?.prefs || {};
        const replayWeather = prefs.replayWeather !== false;

        this.reapplySceneMeshes();

        if (immersive) {
            this._applyManifestFallback(immersive);
        }

        const weather = replayWeather ? (immersive?.weather ?? state.weather) : null;
        if (weather) {
            if (weather.active) {
                window.WeatherSystem?.applyNetworkState?.(weather, { smooth: false });
            } else {
                window.WeatherSystem?.stop?.();
            }
        }

        const zoneCount = window.AudioZoneSystem?._zones?.length || 0;
        if (zoneCount > 0) {
            await window.AudioZoneSystem?.start?.();
        }

        this._lastApplied = {
            at: Date.now(),
            weather: !!weather?.active,
            zones: zoneCount,
            hooks: window.ShaderRegistry?._targets?.length || 0,
            graphs: window.ShaderNodeGraph?._targets?.length || 0,
        };

        window.dispatchEvent(new CustomEvent('immersive-replay', { detail: this._lastApplied }));
        return this._lastApplied;
    },

    getStatus() {
        return this._lastApplied;
    },
};

window.ImmersiveReplay = ImmersiveReplay;
window.captureImmersiveBlock = captureImmersiveBlock;