/** Low-poly starter mesh helpers — shared geos, canvas detail, material presets */

export const SEG = { cyl: 6, cylMed: 8, sphere: 8, cone: 4, disc: 12, ring: 24 };

const _geoCache = new Map();

export function cachedGeo(key, factory) {
    if (!_geoCache.has(key)) _geoCache.set(key, factory());
    return _geoCache.get(key);
}

export function createCanvasTexture(THREE, drawFn, w = 128, h = w) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export function createNoiseMap(THREE, size = 64, alpha = 0.35) {
    return createCanvasTexture(THREE, (ctx, w, h) => {
        const img = ctx.createImageData(w, h);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = 128 + (Math.random() - 0.5) * 80;
            img.data[i] = v;
            img.data[i + 1] = v;
            img.data[i + 2] = v;
            img.data[i + 3] = 255 * alpha;
        }
        ctx.putImageData(img, 0, 0);
    }, size, size);
}

export function createStarterMaterials(THREE) {
    const noise = createNoiseMap(THREE, 64, 0.28);

    const pole = new THREE.MeshStandardMaterial({
        color: 0x3a3e44,
        roughness: 0.42,
        metalness: 0.48,
        envMapIntensity: 0.38,
    });
    const wood = new THREE.MeshStandardMaterial({
        color: 0x5a4838,
        roughness: 0.82,
        metalness: 0.04,
        envMapIntensity: 0.24,
    });
    const wall = new THREE.MeshStandardMaterial({
        color: 0x4a4e54,
        roughness: 0.78,
        metalness: 0.03,
        envMapIntensity: 0.22,
    });
    const metal = new THREE.MeshStandardMaterial({
        color: 0x6a6e74,
        roughness: 0.38,
        metalness: 0.62,
        envMapIntensity: 0.42,
    });
    const barrier = new THREE.MeshStandardMaterial({
        color: 0x5a6068,
        roughness: 0.45,
        metalness: 0.35,
        envMapIntensity: 0.35,
    });
    const asphalt = new THREE.MeshStandardMaterial({
        color: 0x24262a,
        roughness: 0.92,
        metalness: 0.02,
        envMapIntensity: 0.18,
    });
    const bird = new THREE.MeshStandardMaterial({ color: 0x2a2828, roughness: 0.82, metalness: 0.02 });
    const blade = new THREE.MeshStandardMaterial({
        color: 0x6a7078,
        roughness: 0.55,
        metalness: 0.25,
        envMapIntensity: 0.3,
    });
    const dash = new THREE.MeshStandardMaterial({
        color: 0xe8d070,
        roughness: 0.7,
        emissive: 0x3a3010,
        emissiveIntensity: 0.1,
    });
    const stripe = new THREE.MeshStandardMaterial({
        color: 0xdaba44,
        roughness: 0.75,
        metalness: 0.04,
        envMapIntensity: 0.2,
    });

    [pole, wood, wall, metal, barrier, asphalt].forEach((m) => {
        if (m.roughnessMap === undefined) {
            m.roughnessMap = noise;
            m.roughnessMap.wrapS = THREE.RepeatWrapping;
            m.roughnessMap.wrapT = THREE.RepeatWrapping;
            m.roughnessMap.repeat.set(4, 4);
        }
    });

    return { pole, wood, wall, metal, barrier, asphalt, bird, blade, dash, stripe, noise };
}

export function makeBillboardTex(THREE, title, subtitle) {
    return createCanvasTexture(THREE, (ctx, size) => {
        const bands = ['#1a4a6a', '#2a6a8a', '#e8c040', '#c84830', '#1a4a6a'];
        const bandH = size / bands.length;
        bands.forEach((color, i) => {
            ctx.fillStyle = color;
            ctx.fillRect(0, i * bandH, size, bandH);
        });
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.font = 'bold 26px system-ui,sans-serif';
        ctx.fillText(title, 20, 50);
        if (subtitle) {
            ctx.font = '16px system-ui,sans-serif';
            ctx.fillText(subtitle, 20, 78);
        }
    }, 192);
}

export function makeCoffeeSignTex(THREE) {
    return createCanvasTexture(THREE, (ctx, w, h) => {
        ctx.fillStyle = '#2a1810';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f0e0c8';
        ctx.font = 'bold 22px system-ui,sans-serif';
        ctx.fillText('BREW', 14, 34);
        ctx.font = '12px system-ui,sans-serif';
        ctx.fillStyle = '#c8a878';
        ctx.fillText('open · drip · murmur', 14, 52);
    }, 128, 64);
}

export function makeRegisterTex(THREE) {
    return createCanvasTexture(THREE, (ctx, w, h) => {
        ctx.fillStyle = '#0a1814';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#30e878';
        ctx.font = 'bold 18px monospace';
        ctx.fillText('$4.20', 8, 28);
        ctx.fillStyle = '#208858';
        ctx.font = '10px monospace';
        ctx.fillText('READY', 8, 44);
    }, 96, 56);
}

export function makeTapeTex(THREE) {
    return createCanvasTexture(THREE, (ctx, w, h) => {
        ctx.fillStyle = '#e8c020';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1a1a1a';
        for (let x = 0; x < w; x += 16) {
            ctx.fillRect(x, 0, 8, h);
        }
    }, 64, 16);
}

window.StarterMaterials = {
    SEG,
    cachedGeo,
    createCanvasTexture,
    createNoiseMap,
    createStarterMaterials,
    makeBillboardTex,
    makeCoffeeSignTex,
    makeRegisterTex,
    makeTapeTex,
};