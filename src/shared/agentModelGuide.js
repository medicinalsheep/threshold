/** When/why to use each agent tier — shown in portal + SETUP. */

export const TIER_GUIDE = {
    small: {
        label: 'Small',
        when: 'Chat, questions, planning, one follow-up at a time',
        why: 'Fast replies (~1–3s). Keeps intake conversational without burning tokens.',
        examples: ['npc_chat', 'intent_classify', 'build assistant Q&A'],
        taskIds: ['npc_chat', 'intent_classify'],
    },
    medium: {
        label: 'Medium',
        when: 'Fixes, patches, short snippets, compiler tweaks',
        why: 'Coder models excel at ≤30-line edits. Good for iterating on broken scripts.',
        examples: ['dev_patch', 'dev_suggest', 'prompt_snippet'],
        taskIds: ['dev_patch', 'dev_suggest', 'prompt_snippet'],
    },
    large: {
        label: 'Large',
        when: 'Full world layouts, multi-object scenes, PromptGen runs',
        why: 'Needs 8B+ or Grok for coherent IIFEs. Slower but produces runnable scene scripts.',
        examples: ['scene_script', 'prompter_generate', 'portal GENERATE'],
        taskIds: ['scene_script', 'prompter_generate'],
    },
};

export const PROVIDER_GUIDE = {
    grok: {
        label: 'Grok / xAI',
        when: 'Any device with API key — GitHub Pages, phone, remote',
        why: 'Best large-tier quality. No local GPU required.',
    },
    ollama: {
        label: 'Ollama (local)',
        when: 'Same PC as Threshold repo + Ollama — privacy, offline, mini models',
        why: 'Clone repo → npm run ollama:serve (CORS). Pull medicinalsheep/threshold-mini-* or npm run models:mini.',
    },
    auto: {
        label: 'Auto routing',
        when: 'Default — let Threshold pick per task tier',
        why: 'Small→mini-npc, medium→mini-dev, large→Grok if key set else 8B Ollama.',
    },
};

export function tierOptionsHtml(models, current, tierId, canGrok = true) {
    const guide = TIER_GUIDE[tierId];
    const opts = [`<option value="auto" ${current === 'auto' ? 'selected' : ''}>auto — ${guide.when.split(',')[0]}</option>`];
    if (canGrok) {
        opts.push(`<option value="grok" ${current === 'grok' ? 'selected' : ''}>grok (xAI) — cloud large tasks</option>`);
    }
    (models || []).forEach((m) => {
        opts.push(`<option value="${m}" ${current === m ? 'selected' : ''}>${m}</option>`);
    });
    return opts.join('');
}

export function renderTierGuideHtml() {
    return Object.entries(TIER_GUIDE).map(([id, g]) => `
        <div class="agent-tier-guide-row" data-tier="${id}">
            <strong>${g.label}</strong>
            <span class="agent-tier-guide-when">${g.when}</span>
            <span class="agent-tier-guide-why">${g.why}</span>
        </div>
    `).join('');
}