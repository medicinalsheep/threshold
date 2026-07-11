/**
 * Sandboxed shader node graph — whitelisted onBeforeCompile snippets only.
 * Agents set userData.shaderGraph (preset) or userData.shaderNodes (node id array).
 * No arbitrary GLSL eval — registry nodes compose safe MeshStandardMaterial patches.
 */

import * as THREE from 'three';

function meshMaterials(mesh) {
    if (!mesh?.material) return [];
    return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

/** Whitelisted GLSL node definitions */
export const SHADER_NODES = [
    {
        id: 'fresnel_rim',
        label: 'Fresnel rim highlight',
        agentHint: 'Hero props, glass edges — subtle view-dependent rim.',
        uniforms: {
            uRimColor: () => new THREE.Color(0x88aacc),
            uRimPower: () => 2.4,
            uRimStrength: () => 0.28,
        },
        fragmentInject: `
            float rimDot = 1.0 - max(dot(normalize(normalGeometry), normalize(-vViewPosition)), 0.0);
            float rim = pow(rimDot, uRimPower) * uRimStrength;
            outgoingLight += uRimColor * rim;
        `,
    },
    {
        id: 'rain_specular',
        label: 'Rain specular boost',
        agentHint: 'Exterior wet surfaces — syncs uWetness from WeatherSystem.',
        uniforms: {
            uWetness: () => 0,
            uSpecBoost: () => 0.42,
        },
        fragmentInject: `
            float rainRim = 1.0 - max(dot(normalize(normalGeometry), normalize(-vViewPosition)), 0.0);
            outgoingLight += vec3(0.55, 0.62, 0.72) * uWetness * uSpecBoost * rainRim * 0.35;
        `,
    },
    {
        id: 'vertex_sway',
        label: 'Vertex wind sway',
        agentHint: 'Foliage proxies, banners — light Y displacement.',
        uniforms: {
            uSwayAmp: () => 0.06,
            uSwaySpeed: () => 1.8,
            uTime: () => 0,
        },
        vertexInject: `
            transformed.y += sin(uTime * uSwaySpeed + position.x * 2.5 + position.z * 1.7) * uSwayAmp;
        `,
    },
    {
        id: 'desaturate_wet',
        label: 'Wet desaturate',
        agentHint: 'Muted albedo when uWetness high — stacks with rain hooks.',
        uniforms: {
            uWetness: () => 0,
            uDesat: () => 0.35,
        },
        fragmentInject: `
            float lum = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
            outgoingLight = mix(outgoingLight, vec3(lum), uWetness * uDesat);
        `,
    },
    {
        id: 'emissive_breathe',
        label: 'Emissive breathe',
        agentHint: 'Signs, portals — GPU emissive pulse (pairs with emissive_pulse hook).',
        uniforms: {
            uBreathe: () => 0,
            uBreatheAmp: () => 0.22,
        },
        fragmentInject: `
            outgoingLight += totalEmissiveRadiance * (sin(uBreathe * 3.2) * 0.5 + 0.5) * uBreatheAmp;
        `,
    },
];

/** Preset graphs — agents pick one id instead of hand-picking nodes */
export const SHADER_GRAPHS = [
    { id: 'wet_hero', label: 'Wet hero surface', nodes: ['rain_specular', 'fresnel_rim', 'desaturate_wet'] },
    { id: 'storm_exterior', label: 'Storm exterior', nodes: ['rain_specular', 'desaturate_wet', 'fresnel_rim'] },
    { id: 'wind_foliage', label: 'Wind foliage', nodes: ['vertex_sway'] },
    { id: 'neon_rim', label: 'Neon rim display', nodes: ['fresnel_rim', 'emissive_breathe'] },
    { id: 'glass_rim', label: 'Glass edge rim', nodes: ['fresnel_rim'] },
];

const NODE_MAP = new Map(SHADER_NODES.map((n) => [n.id, n]));
const GRAPH_MAP = new Map(SHADER_GRAPHS.map((g) => [g.id, g]));

function resolveNodeIds(meshOrGraphId, nodeIds) {
    if (Array.isArray(nodeIds) && nodeIds.length) {
        return nodeIds.filter((id) => NODE_MAP.has(id));
    }
    const graphId = typeof meshOrGraphId === 'string' ? meshOrGraphId : meshOrGraphId?.userData?.shaderGraph;
    if (graphId && GRAPH_MAP.has(graphId)) return [...GRAPH_MAP.get(graphId).nodes];
    const raw = meshOrGraphId?.userData?.shaderNodes;
    if (Array.isArray(raw)) return raw.filter((id) => NODE_MAP.has(id));
    return [];
}

function createUniforms(nodeIds) {
    const out = {};
    nodeIds.forEach((id) => {
        const node = NODE_MAP.get(id);
        if (!node?.uniforms) return;
        Object.entries(node.uniforms).forEach(([key, factory]) => {
            if (!out[key]) out[key] = { value: typeof factory === 'function' ? factory() : factory };
        });
    });
    return out;
}

function injectNodes(shader, nodeIds) {
    nodeIds.forEach((id) => {
        const node = NODE_MAP.get(id);
        if (!node) return;
        if (node.vertexInject) {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>\n${node.vertexInject}`
            );
        }
        if (node.fragmentInject) {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                `${node.fragmentInject}\n#include <output_fragment>`
            );
        }
    });
}

function compileMaterial(material, nodeIds, mesh) {
    if (!material || !nodeIds.length) return;
    const uniformDefs = createUniforms(nodeIds);
    const prior = material.onBeforeCompile;

    material.onBeforeCompile = (shader) => {
        prior?.(shader);
        Object.entries(uniformDefs).forEach(([key, def]) => {
            shader.uniforms[key] = { value: def.value };
        });
        injectNodes(shader, nodeIds);
        if (mesh) {
            mesh.userData = mesh.userData || {};
            mesh.userData._shaderUniforms = shader.uniforms;
            mesh.userData._shaderNodeIds = [...nodeIds];
        }
    };
    material.customProgramCacheKey = () => `th_nodes_${nodeIds.join('_')}`;
    material.needsUpdate = true;
}

export function getShaderGraphPromptBlock() {
    return `
THRESHOLD SHADER NODE GRAPH (sandboxed — no raw GLSL):
Presets: ${SHADER_GRAPHS.map((g) => `${g.id} (${g.label})`).join(' · ')}
Nodes: ${SHADER_NODES.map((n) => n.id).join(', ')}
Apply: ShaderNodeGraph.applyGraph(mesh, 'wet_hero') OR mesh.userData.shaderGraph = 'storm_exterior'
Custom: mesh.userData.shaderNodes = ['fresnel_rim','rain_specular'] — whitelist only.`.trim();
}

export const ShaderNodeGraph = {
    _targets: [],

    init() {
        this._collectFromScene();
    },

    registerMesh(mesh) {
        const nodeIds = resolveNodeIds(mesh);
        if (!nodeIds.length) return;
        meshMaterials(mesh).forEach((m) => compileMaterial(m, nodeIds, mesh));
        if (!this._targets.includes(mesh)) this._targets.push(mesh);
    },

    applyGraph(mesh, graphId, { nodes } = {}) {
        if (!mesh) return null;
        mesh.userData = mesh.userData || {};
        if (graphId && GRAPH_MAP.has(graphId)) {
            mesh.userData.shaderGraph = graphId;
            delete mesh.userData.shaderNodes;
        } else if (nodes?.length) {
            mesh.userData.shaderNodes = nodes.filter((id) => NODE_MAP.has(id));
            delete mesh.userData.shaderGraph;
        } else return null;
        this.registerMesh(mesh);
        window.ShaderRegistry?.registerMesh?.(mesh);
        window.WeatherSystem?.registerMesh?.(mesh);
        return GRAPH_MAP.get(graphId) || { id: 'custom', nodes: mesh.userData.shaderNodes };
    },

    removeGraph(mesh) {
        meshMaterials(mesh).forEach((m) => {
            m.onBeforeCompile = () => {};
            m.customProgramCacheKey = () => '';
            m.needsUpdate = true;
        });
        if (mesh?.userData) {
            delete mesh.userData.shaderGraph;
            delete mesh.userData.shaderNodes;
            delete mesh.userData._shaderUniforms;
            delete mesh.userData._shaderNodeIds;
        }
        this._targets = this._targets.filter((m) => m !== mesh);
    },

    _collectFromScene() {
        this._targets = [];
        const objects = window.State?.objects || [];
        const visit = (node) => {
            if (node?.isMesh && (node.userData?.shaderGraph || node.userData?.shaderNodes?.length)) {
                this.registerMesh(node);
            }
        };
        objects.forEach((o) => {
            visit(o);
            o.traverse?.(visit);
        });
    },

    tick(dt = 0.016) {
        if (window.State?.isPaused) return;
        const now = performance.now() * 0.001;
        const rain = window.WeatherSystem?.getIntensity?.() ?? 0;
        const Vis = window.VisibilitySystem;
        this._targets = this._targets.filter((m) => m.parent);

        this._targets.forEach((mesh) => {
            // E3: skip off-screen graph uniform updates
            if (Vis?.shouldProcessEnv && !Vis.shouldProcessEnv(mesh)) return;
            const uniforms = mesh.userData?._shaderUniforms;
            if (!uniforms) return;
            if (uniforms.uTime) uniforms.uTime.value = now;
            if (uniforms.uWetness) uniforms.uWetness.value = rain;
            if (uniforms.uBreathe) uniforms.uBreathe.value = now;
        });
    },

    collectExportEntries() {
        return this._targets.map((mesh) => ({
            name: mesh.userData?.name || mesh.userData?.id || 'mesh',
            shaderGraph: mesh.userData?.shaderGraph || null,
            shaderNodes: mesh.userData?.shaderNodes || null,
            materialPreset: mesh.userData?.materialPreset,
        })).filter((e) => e.shaderGraph || e.shaderNodes?.length);
    },
};

window.ShaderNodeGraph = ShaderNodeGraph;
window.SHADER_NODES = SHADER_NODES;
window.SHADER_GRAPHS = SHADER_GRAPHS;