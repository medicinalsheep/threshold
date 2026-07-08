/**
 * Asset production plan — ordered pipeline, review gates, and agent prompt engineering.
 * Ensures interior/exterior, weather variants, collision, and texture workflow align before codegen.
 */

/** Canonical build order — agents must follow this sequence */
export const PRODUCTION_PIPELINE = [
    {
        id: 'scope',
        order: 1,
        label: 'Scope & placement',
        agentFocus: 'Confirm interior vs exterior, scale, and whether asset is hero or dressing.',
    },
    {
        id: 'collision',
        order: 2,
        label: 'Collision & physics',
        agentFocus: 'Static floor/wall vs dynamic prop; mass/friction; surfaceType for footsteps.',
    },
    {
        id: 'mesh',
        order: 3,
        label: 'Mesh / GLB',
        agentFocus: 'Blender export or procedural primitive; poly budget; LOD if large.',
    },
    {
        id: 'textures',
        order: 4,
        label: 'PBR textures (master)',
        agentFocus: '2K+ albedo, roughness, normal (+ metalness if metal). Object name = GIMP manifest slot.',
    },
    {
        id: 'hilod',
        order: 5,
        label: 'HILOD + compression',
        agentFocus: 'npm run textures:watch auto-builds _1k/_2k + WebP — do not hand-author 512px maps.',
    },
    {
        id: 'weather',
        order: 6,
        label: 'Weather hooks',
        agentFocus: 'Exterior: surfaceType + optional wet/dust/snow variants. Interior: zoneSheltered. Glass: wetGlass.',
    },
    {
        id: 'interact',
        order: 7,
        label: 'Interact & audio',
        agentFocus: 'interactHint, soundTrigger, soundClipId; F-key radius if needed.',
    },
    {
        id: 'codegen',
        order: 8,
        label: 'Compiler script',
        agentFocus: 'IIFE extending grid; userData wired; UI.status on success.',
    },
    {
        id: 'verify',
        order: 9,
        label: 'PLAY verify',
        agentFocus: 'Test walk, weather ON, graphics tier Lite + Realistic; export preflight.',
    },
];

export const PLACEMENT_OPTIONS = [
    { id: 'exterior', label: 'Exterior — exposed to weather' },
    { id: 'interior', label: 'Interior — sheltered, no rain/snow on surfaces' },
    { id: 'transitional', label: 'Transitional — porch, awning, partial cover' },
    { id: 'floating', label: 'Floating / surreal — weather optional' },
];

export const WEATHER_EXPOSURE_OPTIONS = [
    { id: 'full', label: 'Full exposure — needs wet + dust handling' },
    { id: 'partial', label: 'Partial — marquee/awning dampening only' },
    { id: 'sheltered', label: 'Sheltered — no wet variants required' },
    { id: 'none', label: 'Not applicable (UI / character / sound only)' },
];

export const WEATHER_VARIANT_OPTIONS = [
    { id: 'wet', label: 'Wet rain response (roughness lerp)' },
    { id: 'dust', label: 'Dust / dry wear (roughness + albedo mute)' },
    { id: 'snow', label: 'Snow accumulation (optional top normal overlay)' },
    { id: 'wet_glass', label: 'Wet glass (wetGlass + transmission lerp)' },
];

export const SURFACE_TYPE_OPTIONS = [
    'concrete', 'asphalt', 'wood', 'metal', 'gravel', 'grass', 'glass', 'fabric', 'dirt',
];

export const COLLISION_OPTIONS = [
    { id: 'static', label: 'Static — floors, walls, locked platforms' },
    { id: 'dynamic', label: 'Dynamic — props with mass' },
    { id: 'trigger', label: 'Trigger only — no physics, interact volume' },
    { id: 'none', label: 'Visual only — no collision' },
];

const ENGINE_TEXTURE_RULES = `
THRESHOLD TEXTURE RULES (engine-compatible):
- GIMP object name MUST match mesh userData.name exactly (e.g. "Rust Bench" → rust_bench_albedo.png slug).
- Export master PNG at 2K (2048px) minimum for hero surfaces; 1K only for tiny props.
- Required maps: albedo (sRGB), roughness (linear), normal (OpenGL +Y); metalness if metallic.
- UVs: tile 1–4× on large floors; unique UV0 on hero props; no stretched sub-256px texels on walk surfaces.
- After save: textures:watch → _1k (1024px) + _2k (2048px) PNG tiers + WebP compression for Lite/Mobile.
- Never use CanvasTexture, procedural noise, or 512-only maps in shipped assets.
`.trim();

const ENGINE_WEATHER_RULES = `
THRESHOLD WEATHER WIRING:
- Exterior ground: userData.surfaceType = 'concrete'|'asphalt'|'gravel'|'wood'|'metal' — WeatherSystem wetness lerps roughness when rain intensity > 0.
- Interior: userData.zoneSheltered = true (optional zoneRadius) — rain stress reduced in PLAY.
- Glass / windows: userData.wetGlass = true on mesh — registers wetGlass targets (roughness + transmission lerp).
- Marquee / emissive signs: userData.weatherMarquee = true — dampens emissive under rain.
- Dust variant: store dry roughness in material; optional userData.dustExposure for future dust pass (roughness +0.08, albedo *0.92).
- Snow: optional second material or userData.snowCap — document in plan; default engine uses rain wetness only today.
- Order: assign surfaceType BEFORE enabling weather in PLAY test.
`.trim();

const ENGINE_COLLISION_RULES = `
THRESHOLD COLLISION WIRING:
- Static: World.createObject(..., usePhysics true) + userData.locked = true + userData.hasPhysics = true.
- Dynamic: userData.mass, friction, restitution; no locked flag.
- Triggers: userData.interactRadius, interactHint, interactAction — no Physics body.
- surfaceType drives Footsteps.js material sounds in PLAY walk mode.
- GLTF: INSERT with physics on; bbox collision from Blender; name matches manifest.
`.trim();

export function defaultProductionAnswers() {
    return {
        placement: 'exterior',
        weatherExposure: 'full',
        weatherVariants: ['wet'],
        surfaceType: 'concrete',
        collision: 'static',
        sheltered: false,
        needsWetVariant: true,
        needsDustVariant: false,
        needsSnowVariant: false,
        wetGlass: false,
        interact: false,
        notes: '',
    };
}

export function buildProductionPlan(brief = {}) {
    const a = brief.answers || {};
    const prod = { ...defaultProductionAnswers(), ...(a.production || {}) };
    const type = brief.type || 'prop';

    const placement = PLACEMENT_OPTIONS.find((p) => p.id === prod.placement) || PLACEMENT_OPTIONS[0];
    const weatherExposure = WEATHER_EXPOSURE_OPTIONS.find((w) => w.id === prod.weatherExposure) || WEATHER_EXPOSURE_OPTIONS[0];
    const collision = COLLISION_OPTIONS.find((c) => c.id === prod.collision) || COLLISION_OPTIONS[0];

    const isInterior = prod.placement === 'interior';
    const isExterior = prod.placement === 'exterior' || prod.placement === 'transitional';
    const needsWeather = isExterior && prod.weatherExposure !== 'none' && prod.weatherExposure !== 'sheltered';

    const steps = PRODUCTION_PIPELINE.filter((step) => {
        if (type === 'texture' || type === 'sound') {
            return ['scope', 'textures', 'hilod', 'weather', 'verify'].includes(step.id);
        }
        if (type === 'animation') {
            return !['textures', 'hilod'].includes(step.id);
        }
        return true;
    });

    return {
        type,
        title: a.title || 'Untitled',
        placement: prod.placement,
        placementLabel: placement.label,
        weatherExposure: prod.weatherExposure,
        weatherExposureLabel: weatherExposure.label,
        weatherVariants: prod.weatherVariants || [],
        surfaceType: prod.surfaceType || 'concrete',
        collision: prod.collision,
        collisionLabel: collision.label,
        sheltered: isInterior || prod.sheltered || prod.weatherExposure === 'sheltered',
        needsWeather,
        needsWetVariant: needsWeather && (prod.weatherVariants || []).includes('wet'),
        needsDustVariant: needsWeather && (prod.weatherVariants || []).includes('dust'),
        needsSnowVariant: needsWeather && (prod.weatherVariants || []).includes('snow'),
        wetGlass: prod.wetGlass || (prod.weatherVariants || []).includes('wet_glass'),
        interact: prod.interact,
        texRes: a.texRes || '2k',
        textureWorkflow: a.texture || 'gimp',
        poly: a.poly || 'medium',
        style: a.style || 'realistic',
        pipeline: steps,
        notes: prod.notes || '',
    };
}

export function formatPipelineChecklist(plan) {
    return plan.pipeline.map((s) => `${s.order}. ${s.label}`).join(' → ');
}

export function buildProductionReviewPrompt(plan) {
    return `
ASSET PRODUCTION PLAN — follow pipeline order strictly:
${plan.pipeline.map((s) => `${s.order}. ${s.label}: ${s.agentFocus}`).join('\n')}

PLACEMENT: ${plan.placementLabel}
WEATHER: ${plan.weatherExposureLabel}${plan.needsWeather ? ` · variants: ${plan.weatherVariants.join(', ') || 'wet'}` : ' · sheltered / N/A'}
SURFACE: ${plan.surfaceType} · COLLISION: ${plan.collisionLabel}
TEXTURES: ${plan.textureWorkflow} @ ${plan.texRes} master · style ${plan.style}
${plan.sheltered ? 'INTERIOR/SHELTERED: set userData.zoneSheltered = true' : ''}
${plan.wetGlass ? 'GLASS: userData.wetGlass = true on glass meshes' : ''}
${plan.interact ? 'INTERACT: userData.interactHint + interactRadius' : ''}
${plan.notes ? `NOTES: ${plan.notes}` : ''}

${ENGINE_TEXTURE_RULES}

${ENGINE_WEATHER_RULES}

${ENGINE_COLLISION_RULES}
`.trim();
}

export function buildAgentPortalSystemPrompt() {
    return `You are Threshold Build Assistant — quality-first asset director for a blank 3D PBR grid.

INTAKE ORDER (one question at a time until ready):
1. Asset type + title (world, prop, character, texture, sound)
2. INTERIOR or EXTERIOR? (sheltered vs weather-exposed)
3. Weather exposure: full / partial / sheltered — need wet, dust, snow, or wet-glass variants?
4. surfaceType for footsteps + rain wetness (concrete, wood, metal, glass, gravel, grass…)
5. Collision: static platform, dynamic prop, trigger volume, or visual-only
6. Texture workflow: GIMP 2K PBR maps OR Blender GLB — poly budget + export targets
7. Interact/audio hooks if any

PIPELINE ORDER (never skip):
scope → collision → mesh → textures (2K master) → HILOD+WebP → weather hooks → interact/audio → Compiler IIFE → PLAY verify

${ENGINE_TEXTURE_RULES}

${ENGINE_WEATHER_RULES}

${ENGINE_COLLISION_RULES}

Ask ONE clear question at a time. Keep replies under 3 sentences.
When ready, respond ONLY with JSON (no markdown):
{"ready":true,"taskType":"world|character|prop|animation|texture|sound","title":"short name","summary":"what to build","style":"realistic PBR","textureRes":"1k|2k|4k","polyBudget":"low|medium|high","workflow":"gimp|blender|both","placement":"interior|exterior|transitional","weatherExposure":"full|partial|sheltered|none","weatherVariants":["wet"],"surfaceType":"concrete","collision":"static|dynamic|trigger|none","sheltered":false}
Otherwise respond with plain text — a single focused question.`;
}

export function buildDesignAgentSystemPrompt() {
    return `You are Threshold design agent. Read the DESIGN BRIEF and ASSET PRODUCTION PLAN.
Follow pipeline order: scope → collision → mesh → textures → HILOD → weather → interact → codegen → verify.
Honor placement (interior/exterior), weather variants, surfaceType, collision, GIMP object names, and poly budget.
If critical details missing, respond ONLY with JSON:
{"intake_questions":[{"id":"...","label":"...","type":"text|select|number|textarea","options":["..."],"required":true}]}
Otherwise output ONLY executable JavaScript IIFE for Compiler extending the blank grid.

${ENGINE_TEXTURE_RULES}

${ENGINE_WEATHER_RULES}

${ENGINE_COLLISION_RULES}`;
}

export function buildCompilerRequest(ctx, chatHistory = []) {
    const plan = buildProductionPlan({
        type: ctx.taskType,
        answers: {
            title: ctx.title,
            description: ctx.summary,
            texRes: ctx.textureRes,
            texture: ctx.workflow,
            poly: ctx.polyBudget,
            style: ctx.style,
            production: {
                placement: ctx.placement,
                weatherExposure: ctx.weatherExposure,
                weatherVariants: ctx.weatherVariants || [],
                surfaceType: ctx.surfaceType,
                collision: ctx.collision,
                sheltered: ctx.sheltered,
                wetGlass: (ctx.weatherVariants || []).includes('wet_glass'),
            },
        },
    });

    return `BUILD REQUEST
Type: ${ctx.taskType || 'world'}
Title: ${ctx.title || 'Untitled'}
Summary: ${ctx.summary || ''}
Style: ${ctx.style || 'realistic PBR default'}
Texture: ${ctx.workflow || 'gimp'} @ ${ctx.textureRes || '2k'}
Poly: ${ctx.polyBudget || 'medium'}

${buildProductionReviewPrompt(plan)}

Conversation:
${chatHistory.map((m) => `${m.role}: ${m.text}`).join('\n')}

Output ONLY executable Threshold JavaScript IIFE for Compiler. Extend the blank grid. No World.clearWorld().
Wire userData.surfaceType, collision, and weather flags per plan BEFORE UI.status success.`;
}

window.AssetProductionPlan = {
    PRODUCTION_PIPELINE,
    buildProductionPlan,
    buildProductionReviewPrompt,
    buildAgentPortalSystemPrompt,
    buildDesignAgentSystemPrompt,
    buildCompilerRequest,
    formatPipelineChecklist,
    defaultProductionAnswers,
};