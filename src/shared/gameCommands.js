/** Slash commands for in-game chat (replaces dev console). */

export const GAME_COMMANDS = [
    { name: 'help', aliases: ['?'], desc: 'Commands & controls', category: 'general' },
    { name: 'agent', aliases: ['ai'], desc: 'Open AI build portal', category: 'build' },
    { name: 'setup', desc: 'Agent SETUP panel', category: 'build' },
    { name: 'pause', aliases: ['edit'], desc: 'Pause → EDIT mode', category: 'session' },
    { name: 'play', aliases: ['resume'], desc: 'Resume → PLAY mode', category: 'session' },
    { name: 'walk', desc: 'Walk controls', category: 'controls' },
    { name: 'fly', desc: 'Fly controls', category: 'controls' },
    { name: 'touch', desc: 'Toggle touch controls', category: 'controls' },
    { name: 'save', desc: 'Save world', category: 'world' },
    { name: 'worlds', desc: 'Load saved worlds', category: 'world' },
    { name: 'compiler', desc: 'Open Compiler tab', category: 'tools' },
    { name: 'prompter', desc: 'Open PromptGen tab', category: 'tools' },
    { name: 'tutorial', desc: 'Quick 3-step tutorial', category: 'help' },
    { name: 'keys', desc: 'Key bindings', category: 'help' },
    { name: 'lockui', aliases: ['unlockui'], desc: 'Toggle corner button arrange mode', category: 'ui' },
];

const RUNNERS = {
    help: () => window.HelpMenu?.open?.(),
    agent: () => window.AgentPortal?.show?.({ step: 'build' }),
    setup: () => {
        window.SceneDock?.setFullyHidden?.(false, true);
        window.SceneDock?.openTab?.('setup');
    },
    pause: () => {
        if (!window.State?.isPaused) window.UI?.togglePause?.('Chat command');
    },
    edit: () => RUNNERS.pause(),
    play: () => {
        if (window.State?.isPaused) window.UI?.togglePause?.('');
    },
    resume: () => RUNNERS.play(),
    walk: () => document.getElementById('btn-control-mode')?.click(),
    fly: () => document.getElementById('btn-control-mode')?.click(),
    touch: () => document.getElementById('hub-touch-quick')?.click(),
    save: () => document.getElementById('btn-save-world')?.click(),
    worlds: () => document.getElementById('btn-load-world')?.click(),
    compiler: () => document.querySelector('[data-target="view-compiler"]')?.click(),
    prompter: () => document.querySelector('[data-target="view-prompter"]')?.click(),
    tutorial: () => document.getElementById('btn-restart-walkthrough')?.click(),
    keys: () => document.getElementById('btn-bindings')?.click(),
    lockui: () => window.HubLayout?.toggle?.(),
    unlockui: () => window.HubLayout?.toggle?.(),
};

export function findCommand(name) {
    const n = String(name || '').toLowerCase().replace(/^\//, '');
    return GAME_COMMANDS.find((c) => c.name === n || c.aliases?.includes(n)) || null;
}

export function runCommand(raw) {
    const line = String(raw || '').trim();
    if (!line.startsWith('/')) return { ok: false, error: 'Not a command' };
    const parts = line.slice(1).split(/\s+/);
    const cmd = findCommand(parts[0]);
    if (!cmd) return { ok: false, error: `Unknown command: /${parts[0]} — type /help` };
    const runner = RUNNERS[cmd.name] || RUNNERS[cmd.aliases?.find((a) => RUNNERS[a])];
    if (!runner) return { ok: false, error: `Command /${cmd.name} not wired yet` };
    runner();
    return { ok: true, cmd: cmd.name };
}

export function commandHintList(filter = '') {
    const q = filter.toLowerCase();
    return GAME_COMMANDS.filter((c) => !q || c.name.startsWith(q) || c.aliases?.some((a) => a.startsWith(q)));
}