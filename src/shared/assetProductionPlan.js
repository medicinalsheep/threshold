/**
 * Asset production plan — ordered pipeline, review gates, and agent prompt engineering.
 * Ensures interior/exterior, weather variants, collision, and texture workflow align before codegen.
 * Integrates generationPolicy: intensity budgets + MOD required/optional reasoning.
 */

import {
    buildGenerationReasoningPrompt,
    planFeatureBudget,
    planCharacterMods,
    enrichReadyContext,
} from './generationPolicy.js';

/** Canonical build order — agents must follow this sequence */
export const PRODUCTION_PIPELINE = [
    {
        id: 'scope',
        order: 1,
        label: 'Scope & intensity',
        agentFocus: 'Intensity minimal|focused|rich|maximal from user need; interior vs exterior; hero vs dressing. Do not overbuild.',
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
        agentFocus: 'Exterior: surfaceType + wet/dust/snow variants. Interior: zoneSheltered. Glass: wetGlass.',
    },
    {
        id: 'atmosphere',
        order: 7,
        label: 'Atmosphere & lighting',
        agentFocus: 'Environment.setTimeOfDay, setFog, ambient zones; audio reverb hints for interiors.',
    },
    {
        id: 'shaders',
        order: 8,
        label: 'Material presets',
        agentFocus: 'MaterialPresets.applyMaterialPreset — no CanvasTexture/procedural slop; match GIMP maps.',
    },
    {
        id: 'appearance',
        order: 9,
        label: 'Character MOD / appearance',
        agentFocus: 'If character/NPC: required MOD slots for archetype; optional slots by intensity only; bodyId/hairId/mods[] from catalog.',
    },
    {
        id: 'interact',
        order: 10,
        label: 'Interact & audio',
        agentFocus: 'Only if needed: interactHint, soundTrigger, soundClipId, audioZone; F-key radius.',
    },
    {
        id: 'codegen',
        order: 11,
        label: 'Compiler script',
        agentFocus: 'IIFE extending grid; userData wired; respect prop/NPC budgets; UI.status on success.',
    },
    {
        id: 'verify',
        order: 12,
        label: 'PLAY verify',
        agentFocus: 'Test walk, weather ON, graphics Lite + Realistic; export preflight slop scan.',
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

export const ATMOSPHERE_PRESETS = [
    { id: 'day_clear', label: 'Day — clear sky', timeOfDay: 14, fog: 0.008 },
    { id: 'golden_hour', label: 'Golden hour', timeOfDay: 18.5, fog: 0.012 },
    { id: 'overcast_storm', label: 'Overcast / storm-ready', timeOfDay: 11, fog: 0.022 },
    { id: 'night_neon', label: 'Night urban', timeOfDay: 22, fog: 0.018 },
    { id: 'interior_warm', label: 'Interior warm (sheltered)', timeOfDay: 12, fog: 0.004 },
    { id: 'custom', label: 'Custom — set in notes' },
];

export const SHADER_PRESET_OPTIONS = [
    { id: 'pbr_default', label: 'Realistic PBR (default)' },
    { id: 'pbr_concrete_weathered', label: 'Weathered concrete + dust' },
    { id: 'pbr_asphalt_wet', label: 'Asphalt rain-ready' },
    { id: 'pbr_wood_snow', label: 'Wood + snow cap' },
    { id: 'pbr_metal_brushed', label: 'Brushed metal' },
    { id: 'pbr_glass_wet', label: 'Wet glass / window' },
    { id: 'pbr_emissive_marquee', label: 'Emissive marquee' },
    { id: 'pbr_fabric_muted', label: 'Fabric / awning' },
    { id: 'pbr_stylized_toon', label: 'Stylized (brief only)' },
];

/** Capabilities the engine supports today — agents plan against this registry */
export const IMMERSIVE_CAPABILITIES = {
    weather: ['rain_wetness', 'wet_glass', 'dust_wear', 'snow_accumulation', 'zone_sheltered', 'marquee_dampen'],
    atmosphere: ['time_of_day', 'fog', 'ambient_audio_zones', 'reverb_hints'],
    materials: ['mesh_standard_presets', 'shader_hooks', 'gimp_pbr_hilod', 'webp_lite_tiers'],
    physics: ['static_collision', 'dynamic_props', 'footsteps_surfaceType'],
    interact: ['f_key_radius', 'sound_triggers', 'ambient_zones'],
    future: ['custom_glsl_nodes', 'veo_cutscenes', 'trellis_mesh_gen'],
};

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
- Snow: userData.snowCap = 0–1 on exterior meshes — WeatherSystem lerps roughness up + albedo toward white.
- Dust: userData.dustExposure = 0–1 — dry wear pass (roughness +0.08, albedo *0.92) when rain intensity low.
- Order: assign surfaceType BEFORE enabling weather in PLAY test.
`.trim();

const ENGINE_ATMOSPHERE_RULES = `
THRESHOLD ATMOSPHERE WIRING:
- Engine.setRenderMode(4) once per script — realistic PBR default.
- Environment.setTimeOfDay(hours) — 0–24 float; golden hour ~18.5, night ~22.
- Environment.setFog(density) — 0.004 interior, 0.015–0.025 storm exteriors.
- Interior volumes: userData.zoneSheltered = true + optional userData.audioZone = 'interior_warm'.
- Exterior: pair overcast_storm atmosphere with WeatherSystem rain in PLAY verify.
`.trim();

const ENGINE_SHADER_RULES = `
THRESHOLD MATERIAL / SHADER RULES:
- Use MaterialPresets.applyMaterialPreset(mesh, presetId) — tuned MeshStandardMaterial, no CanvasTexture noise.
- Hero surfaces MUST have GIMP 2K albedo/roughness/normal — preset alone is not enough for ship quality.
- userData.materialPreset = preset id for export preflight and re-apply on load.
- Retro render modes ONLY when brief style=retro — never as default slop fallback.
- Shader hooks: userData.shaderHook — ShaderRegistry.applyHook(mesh, id).
- Shader graphs: userData.shaderGraph = 'wet_hero'|'storm_exterior'|'neon_rim'|'wind_foliage'|'glass_rim' — ShaderNodeGraph.applyGraph(mesh, id).
- Custom node list: userData.shaderNodes = ['fresnel_rim','rain_specular'] — whitelist only.
- Pair with MaterialPresets; optional userData.shaderIntensity 0–1.5.
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
        atmospherePreset: 'day_clear',
        shaderPreset: 'pbr_default',
        audioZone: false,
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
            return !['textures', 'hilod', 'appearance'].includes(step.id);
        }
        if (type === 'character') {
            return !['weather', 'atmosphere'].includes(step.id) || step.id === 'scope';
        }
        if (type !== 'character' && type !== 'world') {
            return step.id !== 'appearance';
        }
        return true;
    });

    const budget = planFeatureBudget({
        title: a.title,
        summary: a.description || a.summary,
        placement: prod.placement,
        message: prod.notes,
    }, type);

    const appearancePlan = (type === 'character' || a.appearance)
        ? planCharacterMods({
            title: a.title,
            summary: a.description || a.summary,
            message: prod.notes,
            ...(a.appearance || {}),
        }, { intensity: budget.intensity })
        : null;

    return {
        type,
        title: a.title || 'Untitled',
        intensity: budget.intensity,
        intensityLabel: budget.intensityLabel,
        placement: prod.placement,
        placementLabel: placement.label,
        weatherExposure: prod.weatherExposure,
        weatherExposureLabel: weatherExposure.label,
        weatherVariants: prod.weatherVariants || budget.weatherVariants || [],
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
        atmospherePreset: prod.atmospherePreset || 'day_clear',
        shaderPreset: prod.shaderPreset || 'pbr_default',
        audioZone: prod.audioZone || false,
        texRes: a.texRes || budget.texRes || '2k',
        textureWorkflow: a.texture || 'gimp',
        poly: a.poly || budget.poly || 'medium',
        style: a.style || 'realistic',
        pipeline: steps,
        notes: prod.notes || '',
        capabilities: IMMERSIVE_CAPABILITIES,
        generationBudget: {
            maxProps: budget.maxProps,
            maxNpcs: budget.maxNpcs,
            maxAudioClips: budget.maxAudioClips,
        },
        appearance: appearancePlan,
    };
}

/** Gate codegen until production intake is complete — blocks AI slop */
export function validateProductionReady(ctx = {}) {
    const errors = [];
    const warnings = [];

    if (!ctx.taskType && !ctx.type) {
        errors.push('Asset type missing — world, prop, character, texture, or sound.');
    }
    if (!ctx.title?.trim?.() && !ctx.summary?.trim?.()) {
        errors.push('Title or summary required — agent cannot codegen without scope.');
    }
    if (!ctx.placement) {
        errors.push('Placement missing — interior vs exterior drives weather hooks.');
    }
    if (!ctx.weatherExposure) {
        warnings.push('Weather exposure not set — defaulting to full exposure.');
    }
    if (!ctx.surfaceType && ctx.placement !== 'floating') {
        warnings.push('surfaceType not set — footsteps and rain wetness need a material.');
    }
    if (!ctx.collision && ctx.taskType !== 'texture' && ctx.taskType !== 'sound') {
        warnings.push('Collision mode not set — static vs dynamic vs visual-only.');
    }
    if (!ctx.textureRes && !ctx.texRes) {
        warnings.push('Texture resolution not set — recommend 2K master for hero surfaces.');
    }
    if (!ctx.workflow && !ctx.texture) {
        warnings.push('Texture workflow not set — GIMP, Blender, or both.');
    }
    const isExterior = ctx.placement === 'exterior' || ctx.placement === 'transitional';
    if (isExterior && ctx.weatherExposure === 'full' && !(ctx.weatherVariants || []).length) {
        warnings.push('Exterior full exposure but no weather variants — add wet at minimum.');
    }
    if ((ctx.taskType === 'character' || ctx.type === 'character') && !ctx.appearance?.mods?.length) {
        warnings.push('Character has no MOD loadout — required slots may be empty; policy will fill from archetype if possible.');
    }
    if (ctx.intensity === 'maximal' && (ctx.taskType === 'prop' || ctx.type === 'prop')) {
        warnings.push('Maximal intensity on a single prop — consider focused intensity to avoid overbuilding.');
    }

    return {
        ready: errors.length === 0,
        canGenerate: errors.length === 0,
        errors,
        warnings,
    };
}

export function validateDesignBrief(brief = {}) {
    const a = brief.answers || {};
    const prod = a.production;
    const errors = [];
    const warnings = [];

    if (!brief.type) errors.push('Design type not selected.');
    if (!a.title?.trim()) errors.push('Title required in design brief.');
    if (!prod) {
        errors.push('Production plan incomplete — complete Step 3 (placement & weather) before RUN AGENT.');
    } else {
        const gate = validateProductionReady({
            taskType: brief.type,
            title: a.title,
            summary: a.description,
            placement: prod.placement,
            weatherExposure: prod.weatherExposure,
            weatherVariants: prod.weatherVariants,
            surfaceType: prod.surfaceType,
            collision: prod.collision,
            textureRes: a.texRes,
            workflow: a.texture,
        });
        errors.push(...gate.errors);
        warnings.push(...gate.warnings);
    }

    return { ready: errors.length === 0, canGenerate: errors.length === 0, errors, warnings };
}

/** Scan live scene for common AI slop patterns before export */
export function assessSceneSlop(objects = []) {
    const warnings = [];
    const sceneObjects = (objects || []).filter((o) => !o.userData?.isPlayer);

    const procedural = sceneObjects.filter((o) => {
        const map = o.material?.map;
        return map?.isCanvasTexture || map?.image?.tagName === 'CANVAS';
    });
    if (procedural.length) {
        warnings.push(`${procedural.length} mesh(es) use CanvasTexture — replace with GIMP 2K PBR maps.`);
    }

    const exteriorFloors = sceneObjects.filter((o) => {
        const ud = o.userData || {};
        const isFloor = ud.locked || ud.hasPhysics || (o.scale?.y < 0.5 && o.scale?.x > 4);
        return isFloor && !ud.zoneSheltered && !ud.surfaceType;
    });
    if (exteriorFloors.length) {
        warnings.push(`${exteriorFloors.length} walk surface(s) lack userData.surfaceType — rain/footsteps broken.`);
    }

    const needsWeather = sceneObjects.filter((o) => {
        const ud = o.userData || {};
        return !ud.zoneSheltered && ud.placement !== 'interior' && ud.surfaceType
            && !ud.dustExposure && !ud.snowCap && ud.surfaceType !== 'glass' && !ud.wetGlass;
    });
    if (needsWeather.length > 3) {
        warnings.push(`${needsWeather.length} exterior meshes have surfaceType but no dust/snow/wetGlass hooks — consider weather variants.`);
    }

    const noPreset = sceneObjects.filter((o) => o.material && !o.userData?.materialPreset && !o.userData?.textures?.albedo);
    if (noPreset.length > 4) {
        warnings.push(`${noPreset.length} objects lack materialPreset or GIMP textures — ship quality at risk.`);
    }

    return warnings;
}

export function formatPipelineChecklist(plan) {
    return plan.pipeline.map((s) => `${s.order}. ${s.label}`).join(' → ');
}

export function buildProductionReviewPrompt(plan) {
    const budget = plan.generationBudget || {};
    const app = plan.appearance;
    return `
ASSET PRODUCTION PLAN — follow pipeline order strictly:
${plan.pipeline.map((s) => `${s.order}. ${s.label}: ${s.agentFocus}`).join('\n')}

INTENSITY: ${plan.intensity || 'focused'} (${plan.intensityLabel || ''}) — do not exceed budgets
BUDGETS: ≤${budget.maxProps ?? '?'} props · ≤${budget.maxNpcs ?? '?'} NPCs · audio clips ≤${budget.maxAudioClips ?? '?'}
PLACEMENT: ${plan.placementLabel}
WEATHER: ${plan.weatherExposureLabel}${plan.needsWeather ? ` · variants: ${(plan.weatherVariants || []).join(', ') || 'wet'}` : ' · sheltered / N/A'}
SURFACE: ${plan.surfaceType} · COLLISION: ${plan.collisionLabel}
TEXTURES: ${plan.textureWorkflow} @ ${plan.texRes} master · style ${plan.style} · poly ${plan.poly}
${plan.sheltered ? 'INTERIOR/SHELTERED: set userData.zoneSheltered = true' : ''}
${plan.wetGlass ? 'GLASS: userData.wetGlass = true on glass meshes' : ''}
${plan.interact ? 'INTERACT: userData.interactHint + interactRadius' : ''}
ATMOSPHERE: ${plan.atmospherePreset} · MATERIAL PRESET: ${plan.shaderPreset}
${plan.audioZone ? 'AUDIO: userData.audioZone for ambient reverb zone' : ''}
${app ? `CHARACTER APPEARANCE: bodyId=${app.bodyId} hairId=${app.hairId}
  REQUIRED mods: ${(app.requiredMods || []).join(', ') || '—'}
  OPTIONAL mods: ${(app.optionalMods || []).join(', ') || '—'}
  RESOLVED loadout: ${(app.mods || []).join(', ') || 'bare'}
  (Use only catalog mod ids; exclusive slots already resolved.)` : ''}
${plan.notes ? `NOTES: ${plan.notes}` : ''}

${ENGINE_TEXTURE_RULES}

${ENGINE_WEATHER_RULES}

${ENGINE_ATMOSPHERE_RULES}

${ENGINE_SHADER_RULES}

${ENGINE_COLLISION_RULES}
`.trim();
}

export function buildAgentPortalSystemPrompt(sessionBrief = {}) {
    const reasoning = buildGenerationReasoningPrompt(sessionBrief, sessionBrief.taskType || 'prop');

    return `You are Threshold Build Assistant — quality-first asset director for immersive PBR experiences.

CORE UX RULES:
- Match **intensity** to the user: "just a crate" → minimal; "tactical operator loadout" → focused character; "stormy outpost" → rich.
- Generate **only what is needed**. Skip weather for pure characters; skip MOD fashion for a single prop; skip atmosphere for texture-only.
- One clear question at a time. Never re-ask confirmed fields.
- Prefer catalog presets and known APIs — no fake engines, no CanvasTexture slop.

INTAKE ORDER (skip steps already answered in chat):
1. Asset type + title (world, prop, character, texture, sound)
2. Intensity if ambiguous (minimal / focused / rich) — or infer from language
3. INTERIOR or EXTERIOR? (characters: usually N/A weather)
4. Weather only if exterior world/prop: full / partial / sheltered + wet|dust|snow as needed
5. surfaceType + collision (skip for pure character appearance)
6. Texture/poly workflow for hero meshes
7. Character only: role/archetype → REQUIRED MOD slots + optional extras
8. Interact/audio only if the brief needs them

PIPELINE:
scope/intensity → collision → mesh → textures → HILOD → weather (if needed) → atmosphere (if needed) → appearance/MODs (if character) → interact → Compiler IIFE → PLAY verify

${reasoning}

${ENGINE_TEXTURE_RULES}

${ENGINE_WEATHER_RULES}

${ENGINE_ATMOSPHERE_RULES}

${ENGINE_SHADER_RULES}

${ENGINE_COLLISION_RULES}

When ready, respond ONLY with JSON (no markdown):
{"ready":true,"taskType":"world|character|prop|animation|texture|sound","title":"short name","summary":"what to build","intensity":"minimal|focused|rich|maximal","style":"realistic PBR","textureRes":"1k|2k|4k","polyBudget":"low|medium|high","workflow":"gimp|blender|both","placement":"interior|exterior|transitional|floating","weatherExposure":"full|partial|sheltered|none","weatherVariants":["wet"],"surfaceType":"concrete","collision":"static|dynamic|trigger|none","sheltered":false,"atmospherePreset":"day_clear","shaderPreset":"pbr_default","appearance":{"bodyId":"male_default|female_default","hairId":"hair_short_m|hair_long_f|none","mods":["catalog_mod_ids"],"archetype":"operator|explorer|scientist|..."}}
- appearance required when taskType is character (or NPC loadout). mods: REQUIRED slots filled; OPTIONAL only if intensity ≥ focused and brief supports them.
- Omit weatherVariants / atmosphere when not needed.
Otherwise respond with plain text — a single focused question.`;
}

export function buildDesignAgentSystemPrompt(brief = {}) {
    const reasoning = buildGenerationReasoningPrompt(brief.answers || brief, brief.type || 'world');
    return `You are Threshold design agent. Read the DESIGN BRIEF and ASSET PRODUCTION PLAN.
Follow pipeline: scope/intensity → collision → mesh → textures → HILOD → weather (if needed) → appearance/MODs (characters) → interact → codegen → verify.
Honor budgets: do not spawn more props/NPCs than intensity allows. Required MOD slots always; optional sparingly.
If critical details missing, respond ONLY with JSON:
{"intake_questions":[{"id":"...","label":"...","type":"text|select|number|textarea","options":["..."],"required":true}]}
Otherwise output ONLY executable JavaScript IIFE for Compiler extending the blank grid.

${reasoning}

${ENGINE_TEXTURE_RULES}

${ENGINE_WEATHER_RULES}

${ENGINE_ATMOSPHERE_RULES}

${ENGINE_SHADER_RULES}

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
                atmospherePreset: ctx.atmospherePreset,
                shaderPreset: ctx.shaderPreset,
                audioZone: ctx.audioZone,
            },
        },
    });

    const app = ctx.appearance || plan.appearance;
    const reasoning = buildGenerationReasoningPrompt({
        title: ctx.title,
        summary: ctx.summary,
        placement: ctx.placement,
        message: ctx.summary,
        ...(app || {}),
    }, ctx.taskType || 'world');

    return `BUILD REQUEST
Type: ${ctx.taskType || 'world'}
Title: ${ctx.title || 'Untitled'}
Summary: ${ctx.summary || ''}
Intensity: ${ctx.intensity || plan.intensity || 'focused'}
Style: ${ctx.style || 'realistic PBR default'}
Texture: ${ctx.workflow || 'gimp'} @ ${ctx.textureRes || plan.texRes || '2k'}
Poly: ${ctx.polyBudget || plan.poly || 'medium'}
${app ? `Appearance: bodyId=${app.bodyId} hairId=${app.hairId} mods=[${(app.mods || []).join(', ')}]` : ''}

${reasoning}

${buildProductionReviewPrompt(plan)}

Conversation:
${chatHistory.map((m) => `${m.role}: ${m.text}`).join('\n')}

Output ONLY executable Threshold JavaScript IIFE for Compiler. Extend the blank grid. No World.clearWorld().
Respect prop/NPC budgets. Wire userData.surfaceType, collision, and weather flags per plan BEFORE UI.status success.
For characters: do not invent gear — use the resolved MOD list when setting NPC/player appearance metadata.`;
}

window.AssetProductionPlan = {
    PRODUCTION_PIPELINE,
    IMMERSIVE_CAPABILITIES,
    ATMOSPHERE_PRESETS,
    SHADER_PRESET_OPTIONS,
    buildProductionPlan,
    buildProductionReviewPrompt,
    buildAgentPortalSystemPrompt,
    buildDesignAgentSystemPrompt,
    buildCompilerRequest,
    formatPipelineChecklist,
    defaultProductionAnswers,
    validateProductionReady,
    validateDesignBrief,
    assessSceneSlop,
    enrichReadyContext,
};