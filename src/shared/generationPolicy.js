/**
 * Generation policy — scope intensity + MOD reasoning + feature budgets.
 * Drives agent prompts and optional auto-apply of appearance/mods for characters.
 */

import policy from '../../config/generation-policy.json';
import modPack from '../../config/avatar-mods.json';
import { resolveMods } from './avatarMod.js';

const INTENSITY_ORDER = ['minimal', 'focused', 'rich', 'maximal'];

function textOf(...parts) {
    return parts.filter(Boolean).join(' ').toLowerCase();
}

/** Infer how much content to generate from user language + task type */
export function inferIntensity(brief = {}, taskType = 'prop') {
    const t = textOf(brief.title, brief.summary, brief.message, brief.idea, brief.notes);
    const type = String(taskType || brief.taskType || brief.type || 'prop').toLowerCase();

    if (/\b(just|only|quick|tiny|simple|single|one |fix|patch|tweak)\b/.test(t)) return 'minimal';
    if (/\b(showcase|full world|entire|everything|maximal|cinematic|demo reel)\b/.test(t)) return 'maximal';
    if (/\b(outpost|district|village|complex|multi|area|base|facility|immersive)\b/.test(t)) return 'rich';
    if (type === 'world') return t.length > 40 ? 'rich' : 'focused';
    if (type === 'character') return 'focused';
    if (type === 'texture' || type === 'sound' || type === 'animation') return 'minimal';
    if (type === 'prop') return 'focused';
    return 'focused';
}

export function intensitySpec(id) {
    return policy.intensities?.[id] || policy.intensities.focused;
}

/** Match character archetype from brief keywords */
export function inferArchetype(brief = {}) {
    const t = textOf(brief.title, brief.summary, brief.message, brief.idea, brief.role, brief.persona);
    const arch = policy.characterArchetypes || {};
    let best = { id: 'civilian', score: 0, ...arch.civilian };
    for (const [id, spec] of Object.entries(arch)) {
        let score = 0;
        for (const kw of spec.keywords || []) {
            if (t.includes(kw.toLowerCase())) score += kw.length > 4 ? 2 : 1;
        }
        if (score > best.score) best = { id, score, ...spec };
    }
    return { id: best.id, label: best.label, requiredSlots: best.requiredSlots || [], preferredSlots: best.preferredSlots || [], preset: best.preset || null, score: best.score };
}

function modsInSlot(slotId) {
    const mods = modPack?.mods || {};
    return Object.entries(mods)
        .filter(([, s]) => s.slot === slotId)
        .map(([id, s]) => ({ id, ...s }));
}

function pickModForSlot(slotId, briefText, intensity) {
    const options = modsInSlot(slotId);
    if (!options.length) return null;
    const t = briefText;
    // Keyword hit on label/tags/id
    let ranked = options.map((m) => {
        let score = 0;
        const hay = `${m.id} ${m.label} ${(m.tags || []).join(' ')} ${(m.category || '')}`.toLowerCase();
        hay.split(/[\s/_-]+/).forEach((w) => {
            if (w.length > 3 && t.includes(w)) score += 2;
        });
        if (m.category && t.includes(m.category)) score += 1;
        return { m, score };
    });
    ranked.sort((a, b) => b.score - a.score);
    if (ranked[0].score > 0) return ranked[0].m.id;
    // Intensity-weighted default: first catalog entry is fine for required
    const idx = intensity === 'minimal' ? 0 : Math.min(ranked.length - 1, intensity === 'maximal' ? 1 : 0);
    return ranked[idx].m.id;
}

/**
 * Build a reasoned MOD loadout.
 * Required slots always filled; preferred/optional filled by intensity + brief hits.
 */
export function planCharacterMods(brief = {}, options = {}) {
    const intensity = options.intensity || inferIntensity(brief, 'character');
    const spec = intensitySpec(intensity);
    const archetype = options.archetype || inferArchetype(brief);
    const t = textOf(brief.title, brief.summary, brief.message, brief.idea, brief.role);
    const catalog = modPack?.mods || {};
    const presets = modPack?.presets || {};

    // Start from catalog preset when archetype maps cleanly
    let seed = [];
    if (archetype.preset && presets[archetype.preset]?.mods) {
        seed = [...presets[archetype.preset].mods];
    }

    const required = [];
    const optional = [];
    const reasoning = [];

    for (const slot of archetype.requiredSlots || []) {
        const existing = seed.find((id) => catalog[id]?.slot === slot);
        if (existing) {
            required.push(existing);
            reasoning.push(`required slot "${slot}" ← preset ${existing}`);
        } else {
            const pick = pickModForSlot(slot, t, intensity);
            if (pick) {
                required.push(pick);
                reasoning.push(`required slot "${slot}" ← ${pick}`);
            } else {
                reasoning.push(`required slot "${slot}" — no catalog piece (skip)`);
            }
        }
    }

    // Preferred slots: fill fraction based on intensity
    const preferred = archetype.preferredSlots || [];
    const fillN = Math.round(preferred.length * (spec.optionalSlotFill || 0.4));
    const preferredHits = preferred
        .map((slot) => {
            const hit = seed.find((id) => catalog[id]?.slot === slot)
                || (t && pickModForSlot(slot, t, intensity));
            return { slot, id: hit };
        })
        .filter((x) => x.id && !required.includes(x.id));

    // Prioritize keyword matches then first fillN
    preferredHits.sort((a, b) => {
        const sa = `${catalog[a.id]?.label || ''}`.toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.includes(w)) ? 1 : 0;
        const sb = `${catalog[b.id]?.label || ''}`.toLowerCase().split(/\s+/).some((w) => w.length > 3 && t.includes(w)) ? 1 : 0;
        return sb - sa;
    });

    preferredHits.slice(0, Math.max(fillN, preferredHits.filter((x) => {
        const hay = `${catalog[x.id]?.label || ''} ${(catalog[x.id]?.tags || []).join(' ')}`.toLowerCase();
        return hay.split(/\s+/).some((w) => w.length > 3 && t.includes(w));
    }).length)).forEach((x) => {
        if (!optional.includes(x.id) && !required.includes(x.id)) {
            optional.push(x.id);
            reasoning.push(`optional slot "${x.slot}" ← ${x.id} (intensity ${intensity})`);
        }
    });

    // Explicit user mentions of mod ids
    Object.keys(catalog).forEach((id) => {
        if (t.includes(id.replace(/_/g, ' ')) || t.includes(id)) {
            if (!required.includes(id) && !optional.includes(id)) {
                optional.push(id);
                reasoning.push(`user-mentioned ← ${id}`);
            }
        }
    });

    const raw = [...required, ...optional];
    const resolved = resolveMods(raw);

    return {
        intensity,
        archetype: archetype.id,
        archetypeLabel: archetype.label,
        requiredMods: required,
        optionalMods: optional,
        mods: resolved,
        bodyId: /female|woman|she\b/.test(t) ? 'female_default' : 'male_default',
        hairId: /female|woman/.test(t) ? 'hair_long_f' : 'hair_short_m',
        reasoning,
        presetUsed: archetype.preset,
    };
}

/** Feature budget for scene/world generation */
export function planFeatureBudget(brief = {}, taskType = 'prop') {
    const intensity = inferIntensity(brief, taskType);
    const spec = intensitySpec(intensity);
    const t = textOf(brief.title, brief.summary, brief.message, brief.idea);
    const type = String(taskType || 'prop').toLowerCase();
    const placement = brief.placement || (/interior|inside|room|lab\b/.test(t) ? 'interior' : 'exterior');

    const needWeather = placement === 'exterior' || placement === 'transitional';
    const weatherRequired = needWeather && intensity !== 'minimal' ? ['wet'] : [];
    const weatherOptional = [];
    if (needWeather && /dust|desert|dry/.test(t)) weatherOptional.push('dust');
    if (needWeather && /snow|winter|cold/.test(t)) weatherOptional.push('snow');
    if (needWeather && /glass|window|rain/.test(t)) weatherOptional.push('wet_glass');

    const weatherVariants = [
        ...weatherRequired,
        ...weatherOptional.slice(0, Math.max(0, (spec.weatherVariantsMax || 1) - weatherRequired.length)),
    ];

    const wantInteract = /\b(interact|terminal|press f|kiosk|button|npc talk)\b/.test(t);
    const wantAudio = /\b(sound|audio|ambient|music|sfx|reverb)\b/.test(t);
    const wantAtmosphere = type === 'world' || intensity === 'rich' || intensity === 'maximal'
        || /\b(dusk|night|fog|storm|mood|atmosphere)\b/.test(t);

    return {
        intensity,
        intensityLabel: spec.label,
        placement,
        maxProps: spec.maxProps,
        maxNpcs: type === 'character' ? 1 : spec.maxNpcs,
        maxAudioClips: wantAudio ? spec.maxAudioClips : (intensity === 'minimal' ? 0 : Math.min(1, spec.maxAudioClips)),
        texRes: brief.textureRes || brief.texRes || spec.texResDefault,
        poly: brief.polyBudget || brief.poly || spec.polyDefault,
        weatherVariants: type === 'character' || type === 'sound' || type === 'texture' ? [] : weatherVariants,
        weatherExposure: type === 'character' ? 'none' : (needWeather ? (intensity === 'minimal' ? 'partial' : 'full') : 'sheltered'),
        sheltered: placement === 'interior',
        interact: wantInteract || type === 'character',
        atmosphere: wantAtmosphere ? (spec.atmosphere || 'light_tune') : 'keep_current',
        includeLod: type === 'character' || type === 'world' || intensity !== 'minimal',
        includeMods: type === 'character' || /\b(avatar|outfit|gear|loadout|npc)\b/.test(t),
        tokenBudgetHint: spec.tokenBudgetHint,
        principles: policy.uxPrinciples || [],
    };
}

/** Compact catalog for agent system prompts (token-efficient) */
export function modCatalogPromptSummary() {
    const slots = modPack?.slots || {};
    const mods = modPack?.mods || {};
    const bySlot = {};
    Object.entries(mods).forEach(([id, s]) => {
        const slot = s.slot || 'accessory';
        if (!bySlot[slot]) bySlot[slot] = [];
        bySlot[slot].push(id);
    });
    const lines = Object.entries(slots).map(([slot, def]) => {
        const ids = (bySlot[slot] || []).slice(0, 8).join(', ');
        const more = (bySlot[slot] || []).length > 8 ? '…' : '';
        return `- ${slot} (${def.exclusive ? 'exclusive' : 'stack'}): ${ids}${more}`;
    });
    return `MOD SLOTS (use catalog ids only; exclusive = one piece):\n${lines.join('\n')}
PRESETS: ${Object.keys(modPack?.presets || {}).join(', ')}
RULE: fill REQUIRED slots for the character archetype; OPTIONAL slots only if intensity allows or user asked. Never invent mod ids.`;
}

/** Full generation brief block injected into agents */
export function buildGenerationReasoningPrompt(brief = {}, taskType = 'prop') {
    const budget = planFeatureBudget(brief, taskType);
    const charPlan = (taskType === 'character' || budget.includeMods)
        ? planCharacterMods(brief, { intensity: budget.intensity })
        : null;

    const lines = [
        'GENERATION REASONING (Threshold quality policy):',
        `Intensity: ${budget.intensity} (${budget.intensityLabel}) — match output size to user need; do not overbuild.`,
        `Budgets: ≤${budget.maxProps} props · ≤${budget.maxNpcs} NPCs · texRes ${budget.texRes} · poly ${budget.poly}`,
        `Weather: ${budget.weatherVariants.length ? budget.weatherVariants.join(', ') : 'none'} · exposure ${budget.weatherExposure}`,
        `Atmosphere: ${budget.atmosphere} · interact: ${budget.interact ? 'yes' : 'only if asked'} · LOD: ${budget.includeLod ? 'yes' : 'optional'}`,
        ...((policy.uxPrinciples || []).slice(0, 5).map((p) => `• ${p}`)),
    ];

    if (charPlan) {
        lines.push(
            `Character archetype: ${charPlan.archetypeLabel} (${charPlan.archetype})`,
            `REQUIRED mods: ${charPlan.requiredMods.join(', ') || '(none)'}`,
            `OPTIONAL mods (may omit if intensity low): ${charPlan.optionalMods.join(', ') || '(none)'}`,
            `Resolved loadout: ${charPlan.mods.join(', ') || '(bare)'}`,
            `bodyId: ${charPlan.bodyId} · hairId: ${charPlan.hairId}`,
            'Emit appearance in ready JSON: "appearance":{"bodyId":"...","hairId":"...","mods":["..."]}',
        );
        lines.push(modCatalogPromptSummary());
    }

    return lines.join('\n');
}

/** Merge AI ready JSON with policy defaults */
export function enrichReadyContext(ready = {}, userText = '') {
    const taskType = ready.taskType || ready.type || 'prop';
    const brief = {
        title: ready.title,
        summary: ready.summary,
        message: userText,
        placement: ready.placement,
        idea: ready.summary,
    };
    const budget = planFeatureBudget({ ...brief, ...ready }, taskType);
    const out = {
        ...ready,
        intensity: ready.intensity || budget.intensity,
        textureRes: ready.textureRes || budget.texRes,
        polyBudget: ready.polyBudget || budget.poly,
        weatherVariants: ready.weatherVariants?.length ? ready.weatherVariants : budget.weatherVariants,
        weatherExposure: ready.weatherExposure || budget.weatherExposure,
        placement: ready.placement || budget.placement,
        sheltered: ready.sheltered ?? budget.sheltered,
        generationBudget: {
            maxProps: budget.maxProps,
            maxNpcs: budget.maxNpcs,
            maxAudioClips: budget.maxAudioClips,
            atmosphere: budget.atmosphere,
        },
    };

    if (taskType === 'character' || ready.appearance || budget.includeMods) {
        const planned = planCharacterMods(
            { ...brief, ...ready.appearance },
            { intensity: out.intensity }
        );
        const aiMods = Array.isArray(ready.appearance?.mods) ? ready.appearance.mods : null;
        out.appearance = {
            bodyId: ready.appearance?.bodyId || planned.bodyId,
            hairId: ready.appearance?.hairId || planned.hairId,
            // Prefer AI list if valid; else reasoned plan
            mods: resolveMods(aiMods?.length ? aiMods : planned.mods),
            archetype: planned.archetype,
            intensity: out.intensity,
            reasoning: planned.reasoning,
        };
    }

    return out;
}

/** Apply appearance plan to local player (SKIN) */
export async function applyAppearancePlan(appearance, options = {}) {
    if (!appearance || !window.AppearanceStore) return null;
    const base = window.AppearanceStore.getPlayerProfile?.() || {};
    const next = window.AppearanceProfile?.normalizeProfile?.({
        ...base,
        bodyId: appearance.bodyId || base.bodyId,
        hairId: appearance.hairId || base.hairId,
        mods: appearance.mods || [],
        colors: { ...base.colors, ...(appearance.colors || {}) },
    }) || { ...base, ...appearance };

    window.AppearanceStore.setPlayerProfile?.(next);
    window.AppearanceProfile?.syncUiFromProfile?.(next);

    if (options.applyToPlayer !== false && window.PlayerController?.group) {
        await window.AvatarLoader?.applyPlayerAppearance?.(window.PlayerController.group, next);
    }
    return next;
}

export function getPolicy() {
    return policy;
}

window.GenerationPolicy = {
    inferIntensity,
    inferArchetype,
    planCharacterMods,
    planFeatureBudget,
    buildGenerationReasoningPrompt,
    enrichReadyContext,
    applyAppearancePlan,
    modCatalogPromptSummary,
    getPolicy,
};
