/**
 * Art naming contract — Engine object name → GIMP / Blender asset paths.
 *
 * Object "Stone Block" →
 *   textures/stone_block_albedo.png  (+ roughness/metalness/normal)
 *   import/stone_block.glb
 *
 * Used by inspector hints, LiveBuild status, TextureBridge slug match.
 */

export function slugifyObjectName(name = '') {
    return String(name)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'object';
}

export function expectedTexturePath(name, slot = 'albedo') {
    const slug = slugifyObjectName(name);
    const s = String(slot || 'albedo').toLowerCase();
    return `textures/${slug}_${s}.png`;
}

export function expectedGlbPath(name) {
    return `import/${slugifyObjectName(name)}.glb`;
}

/**
 * Short multi-line hint for inspector / HUD.
 * @param {string} name
 * @returns {{ slug: string, albedo: string, glb: string, lines: string[], oneLine: string }}
 */
export function artPathsForName(name) {
    const display = String(name || '').trim() || '(unnamed)';
    const slug = slugifyObjectName(display === '(unnamed)' ? '' : display);
    const albedo = expectedTexturePath(display === '(unnamed)' ? 'object' : display, 'albedo');
    const glb = expectedGlbPath(display === '(unnamed)' ? 'object' : display);
    const lines = [
        `Slug: ${slug}`,
        `GIMP: ${albedo}`,
        `Blender: ${glb}`,
    ];
    return {
        slug,
        albedo,
        glb,
        lines,
        oneLine: `${display} → ${albedo} · ${glb}`,
    };
}

/** Status string for one or more newly created objects. */
export function artPathsStatusForObjects(objects = [], { max = 3 } = {}) {
    const named = (objects || [])
        .map((o) => o?.userData?.name || o?.name)
        .filter((n) => n && String(n).trim());
    if (!named.length) return '';
    const slice = named.slice(0, max);
    const bits = slice.map((n) => {
        const p = artPathsForName(n);
        return `${n} → ${p.albedo}`;
    });
    const more = named.length > max ? ` (+${named.length - max} more)` : '';
    return `Art names: ${bits.join('; ')}${more}`;
}

export const ArtNaming = {
    slugify: slugifyObjectName,
    expectedTexturePath,
    expectedGlbPath,
    artPathsForName,
    artPathsStatusForObjects,
};

if (typeof window !== 'undefined') {
    window.ArtNaming = ArtNaming;
}
