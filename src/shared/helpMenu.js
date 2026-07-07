import { GAME_COMMANDS } from './gameCommands.js';

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

const KEY_HINTS = [
    { key: 'T', action: 'Open chat (type / for commands)' },
    { key: 'Esc', action: 'Close chat / menus' },
    { key: 'F', action: 'Interact · AI Build Station' },
    { key: 'V', action: 'Push-to-talk (voice)' },
    { key: 'P / Pause', action: 'Toggle EDIT ↔ PLAY' },
    { key: '`', action: 'Performance HUD toggle' },
    { key: 'Corner hubs', action: 'PLAY/EDIT · TOOLS · SCENE · TOUCH' },
];

export const HelpMenu = {
    init() {
        document.getElementById('help-menu-close')?.addEventListener('click', () => this.close());
        document.getElementById('help-menu-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'help-menu-modal') this.close();
        });
    },

    open() {
        this.render();
        document.getElementById('help-menu-modal')?.classList.add('open');
    },

    close() {
        document.getElementById('help-menu-modal')?.classList.remove('open');
    },

    render() {
        const el = document.getElementById('help-menu-body');
        if (!el) return;

        const byCat = {};
        GAME_COMMANDS.forEach((c) => {
            const cat = c.category || 'general';
            if (!byCat[cat]) byCat[cat] = [];
            byCat[cat].push(c);
        });

        el.innerHTML = `
            <section class="help-menu-section">
                <h3>Chat</h3>
                <p class="insert-hint">Press <strong>T</strong> to open chat. Messages go to your connected agent. Start with <strong>/</strong> for commands — e.g. <code>/help</code> <code>/agent</code> <code>/pause</code></p>
            </section>
            <section class="help-menu-section">
                <h3>Commands</h3>
                ${Object.entries(byCat).map(([cat, cmds]) => `
                    <p class="help-menu-cat">${esc(cat)}</p>
                    <ul class="help-menu-cmd-list">
                        ${cmds.map((c) => `
                            <li><code>/${esc(c.name)}</code> ${c.aliases?.length ? `<span class="help-alias">(${c.aliases.map((a) => `/${a}`).join(', ')})</span>` : ''} — ${esc(c.desc)}</li>
                        `).join('')}
                    </ul>
                `).join('')}
            </section>
            <section class="help-menu-section">
                <h3>Controls</h3>
                <ul class="help-menu-cmd-list">
                    ${KEY_HINTS.map((h) => `<li><strong>${esc(h.key)}</strong> — ${esc(h.action)}</li>`).join('')}
                </ul>
            </section>
            <section class="help-menu-section">
                <h3>UI arrange</h3>
                <p class="insert-hint">Tap <strong>MOVE</strong> (top-right) or type <code>/lockui</code> to drag corner buttons into place. Tap <strong>LOCK</strong> when done.</p>
            </section>
        `;
    },
};

window.HelpMenu = HelpMenu;