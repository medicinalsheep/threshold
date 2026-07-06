import { ViewPrefs } from './viewPrefs.js';

const STORAGE_KEY = 'threshold-agents-v1';

const AGENT_TYPES = {
    local: {
        id: 'local',
        label: 'Local Script',
        description: 'Runs your JavaScript on a timer or when triggered. No API key.',
        needsKey: false,
    },
    grok_dev: {
        id: 'grok_dev',
        label: 'Grok Dev Agent',
        description: 'Suggests Compiler fixes and world code from scene context.',
        needsKey: true,
    },
    grok_npc: {
        id: 'grok_npc',
        label: 'Grok NPC Agent',
        description: 'Dialogue + actions for selected NPC using Grok + live scene.',
        needsKey: true,
    },
    ollama_dev: {
        id: 'ollama_dev',
        label: 'Ollama Dev Agent',
        description: 'Local LLM code suggestions via Ollama (no API key). Does not edit image files.',
        needsKey: false,
    },
};

function loadConfigs() {
    return ViewPrefs.get('agentConfigs', {}) || {};
}

function saveConfigs(all) {
    ViewPrefs.set('agentConfigs', all);
}

export const AgentHub = {
    types: AGENT_TYPES,

    getConfig(type) {
        return loadConfigs()[type] || { enabled: false, persona: '', intervalMs: 0 };
    },

    setConfig(type, patch) {
        const all = loadConfigs();
        all[type] = { ...this.getConfig(type), ...patch };
        saveConfigs(all);
        window.dispatchEvent(new CustomEvent('agent-config-change', { detail: { type } }));
    },

    exportConfigs() {
        return Object.entries(loadConfigs()).map(([type, cfg]) => ({ type, ...cfg }));
    },

    getActiveNpc() {
        const obj = window.State?.selectedObject;
        if (!obj?.userData?.isHuman && !obj?.userData?.isCharacter) return null;
        if (obj.userData?.isPlayer) return null;
        return obj;
    },

    attachNpcAgent(persona = '') {
        const npc = this.getActiveNpc();
        if (!npc) return false;
        npc.userData.agentType = 'grok_npc';
        npc.userData.agentPersona = persona || this.getConfig('grok_npc').persona || 'Friendly guide';
        npc.userData.agentId = npc.userData.agentId || `agent_${npc.userData.id || Date.now()}`;
        this.setConfig('grok_npc', { enabled: true, persona: npc.userData.agentPersona });
        return true;
    },

    tick(_dt) {
        const cfg = this.getConfig('local');
        if (!cfg.enabled || !cfg.script) return;
        if (!cfg._lastTick) cfg._lastTick = 0;
        const now = performance.now();
        const interval = Math.max(1000, cfg.intervalMs || 5000);
        if (now - cfg._lastTick < interval) return;
        cfg._lastTick = now;
        try {
            window.Runtime?.execute?.(cfg.script, 'local-agent');
        } catch (e) {
            console.warn('Local agent error:', e);
        }
    },
};

window.AgentHub = AgentHub;