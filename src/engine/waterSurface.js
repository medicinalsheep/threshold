/**
 * Moat water — GPU waves, fresnel, sun specular, inner-edge foam.
 */
import * as THREE from 'three';

const WATER_VERT = /* glsl */`
uniform float uTime;
uniform float uInnerRadius;
uniform float uFoamWidth;
varying vec3 vWorldPos;
varying vec3 vViewDir;
varying vec2 vUv;

float waveHeight(vec2 p) {
    float t = uTime;
    return sin(p.x * 0.22 + t * 1.15) * 0.07
         + cos(p.y * 0.18 + t * 0.85) * 0.055
         + sin((p.x + p.y) * 0.14 + t * 1.45) * 0.035;
}

void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec2 xz = world.xz;
    float h = waveHeight(xz);
    world.y += h;

    vec4 mvPos = viewMatrix * world;
    gl_Position = projectionMatrix * mvPos;

    vWorldPos = world.xyz;
    vViewDir = normalize(cameraPosition - world.xyz);
    vUv = uv;
}
`;

const WATER_FRAG = /* glsl */`
uniform float uTime;
uniform vec3 uSunDir;
uniform vec3 uWaterColor;
uniform vec3 uDeepColor;
uniform float uInnerRadius;
uniform float uFoamWidth;
uniform samplerCube uEnvMap;
uniform float uEnvIntensity;

varying vec3 vWorldPos;
varying vec3 vViewDir;
varying vec2 vUv;

vec3 waveNormal(vec2 p) {
    float e = 0.15;
    float h = sin(p.x * 0.22 + uTime * 1.15) * 0.07 + cos(p.y * 0.18 + uTime * 0.85) * 0.055;
    float hx = sin((p.x + e) * 0.22 + uTime * 1.15) * 0.07 + cos(p.y * 0.18 + uTime * 0.85) * 0.055;
    float hz = sin(p.x * 0.22 + uTime * 1.15) * 0.07 + cos((p.y + e) * 0.18 + uTime * 0.85) * 0.055;
    return normalize(vec3(h - hx, e * 2.0, h - hz));
}

void main() {
    vec2 xz = vWorldPos.xz;
    vec3 n = waveNormal(xz);
    vec3 v = normalize(vViewDir);

    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.2);
    float sunSpec = pow(max(dot(reflect(-uSunDir, n), v), 0.0), 128.0) * 0.85;
    float sunSpecWide = pow(max(dot(reflect(-uSunDir, n), v), 0.0), 32.0) * 0.18;

    vec3 refl = uEnvIntensity > 0.0
        ? texture(uEnvMap, reflect(-v, n)).rgb * uEnvIntensity
        : vec3(0.08, 0.14, 0.18);
    float depthMix = smoothstep(uInnerRadius + 2.0, uInnerRadius + 18.0, length(xz));
    vec3 base = mix(uWaterColor, uDeepColor, depthMix * 0.65);

    vec3 col = mix(base, refl, fresnel * 0.72);
    col += vec3(0.75, 0.88, 1.0) * sunSpec;
    col += vec3(0.35, 0.5, 0.62) * sunSpecWide;

    float caustic = sin(xz.x * 0.65 + uTime * 1.8) * sin(xz.y * 0.55 - uTime * 1.3);
    col += vec3(0.04, 0.12, 0.14) * max(caustic, 0.0) * 0.35;

    float dist = length(xz);
    float foam = 1.0 - smoothstep(uInnerRadius, uInnerRadius + uFoamWidth, dist);
    foam += sin(uTime * 3.5 + xz.x * 0.8) * 0.08 * foam;
    foam = clamp(foam, 0.0, 1.0);
    vec3 foamCol = vec3(0.82, 0.9, 0.94);
    col = mix(col, foamCol, foam * 0.55);

    float alpha = 0.82 + fresnel * 0.15;
    gl_FragColor = vec4(col, alpha);
}
`;

const FOAM_VERT = /* glsl */`
varying float vFoam;
void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * world;
    vFoam = uv.y;
}
`;

const FOAM_FRAG = /* glsl */`
uniform float uTime;
varying float vFoam;

void main() {
    float pulse = 0.55 + sin(uTime * 4.0) * 0.12;
    float a = smoothstep(0.0, 1.0, vFoam) * pulse * 0.7;
    gl_FragColor = vec4(0.88, 0.94, 0.98, a);
}
`;

export function createWaterShaderMaterial(innerRadius, foamWidth = 1.4) {
    const uniforms = {
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0.4, 0.85, 0.25).normalize() },
        uWaterColor: { value: new THREE.Color(0x2288a8) },
        uDeepColor: { value: new THREE.Color(0x062830) },
        uInnerRadius: { value: innerRadius },
        uFoamWidth: { value: foamWidth },
        uEnvMap: { value: null },
        uEnvIntensity: { value: 0.45 },
    };

    const mat = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: WATER_VERT,
        fragmentShader: WATER_FRAG,
        transparent: true,
        depthWrite: true,
        side: THREE.DoubleSide,
    });
    mat.name = 'threshold-water-surface';
    return mat;
}

export function createFoamRingMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: FOAM_VERT,
        fragmentShader: FOAM_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
}

export function bindWaterEnvMap(material, scene) {
    if (material?.uniforms?.uEnvMap && scene?.environment) {
        material.uniforms.uEnvMap.value = scene.environment;
    }
}

export function updateWaterShaderMaterials(env, timeMs, scene) {
    const t = timeMs * 0.001;
    const sun = env.sunLight;
    if (!env._waterSunDir) env._waterSunDir = new THREE.Vector3(0.4, 0.85, 0.25);
    const sunDir = env._waterSunDir;
    if (sun) sunDir.copy(sun.position).normalize();

    const apply = (mat) => {
        if (!mat?.uniforms) return;
        if (mat.uniforms.uTime) mat.uniforms.uTime.value = t;
        if (mat.uniforms.uSunDir) mat.uniforms.uSunDir.value.copy(sunDir);
        if (mat.uniforms.uEnvMap && scene?.environment) {
            mat.uniforms.uEnvMap.value = scene.environment;
        }
    };

    apply(env.waterShaderMat);
    if (env.waterFoamMat?.uniforms?.uTime) {
        env.waterFoamMat.uniforms.uTime.value = t;
    }
}

/** Hide surface meshes while the reflector pass runs (avoids self-reflection). */
export function attachReflectorHooks(env) {
    if (!env.waterReflector || env._reflectorHooks) return;
    env._reflectorHooks = true;
    env.waterReflector.onBeforeRender = () => {
        if (env.waterMesh) env.waterMesh.visible = false;
        if (env.waterFoamMesh) env.waterFoamMesh.visible = false;
    };
    env.waterReflector.onAfterRender = () => {
        if (env.waterMesh) env.waterMesh.visible = true;
        if (env.waterFoamMesh) env.waterFoamMesh.visible = true;
    };
}