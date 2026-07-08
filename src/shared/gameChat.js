/**
 * In-game chat — T to open, / for slash commands (replaces dev console).
 */

import { ViewPrefs } from './viewPrefs.js';
import { runCommand, commandHintList } from './gameCommands.js';
import { AgentRouter } from './agentRouter.js';
import { IntentRouter } from './intentRouter.js';

const LOG_MAX = 40;
const PREFS_KEY = 'gameChatLog';

function isTypingElsewhere() {
    const el = document.activeElement;
    if (!el) return false;
    if (el.id === 'game-chat-input') return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
}

export const GameChat = {
    _open: false,
    _busy: false,
    _log: ViewPrefs.get(PREFS_KEY, []),

    init() {
        const input = document.getElementById('game-chat-input');
        const wrap = document.getElementById('game-chat');

        document.getElementById('game-chat-close')?.addEventListener('click', () => this.close());

        input?.addEventListener('input', () => this.updatePrefix());
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this.close();
            }
            if (e.key === 'Tab' && input.value.startsWith('/')) {
                e.preventDefault();
                const partial = input.value.slice(1).split(/\s/)[0];
                const matches = commandHintList(partial);
                if (matches[0]) input.value = `/${matches[0].name} `;
            }
        });
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.submit();
            }
        });

        wrap?.addEventListener('click', (e) => e.stopPropagation());

        window.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyT' || e.ctrlKey || e.metaKey || e.altKey) return;
            if (!document.body.classList.contains('engine-chrome')) return;
            if (!document.getElementById('view-engine')?.classList.contains('active')) return;
            if (isTypingElsewhere()) return;
            e.preventDefault();
            this.toggle();
        });

        this.renderLog();
        this.updatePrefix();
    },

    isOpen() {
        return this._open;
    },

    toggle() {
        if (this._open) this.close();
        else this.open();
    },

    open() {
        const wrap = document.getElementById('game-chat');
        if (!wrap) return;
        this._open = true;
        wrap.classList.add('open');
        wrap.classList.remove('hidden');
        document.body.classList.add('game-chat-open');
        const input = document.getElementById('game-chat-input');
        input?.focus();
        this.updatePrefix();
        this.scrollLog();
    },

    close() {
        this._open = false;
        document.getElementById('game-chat')?.classList.remove('open');
        document.body.classList.remove('game-chat-open');
        document.getElementById('game-chat-input')?.blur();
    },

    updatePrefix() {
        const input = document.getElementById('game-chat-input');
        const prefix = document.getElementById('game-chat-prefix');
        if (!input || !prefix) return;
        const isCmd = input.value.startsWith('/');
        prefix.textContent = isCmd ? '/' : '›';
        prefix.classList.toggle('game-chat-prefix-cmd', isCmd);
        input.classList.toggle('game-chat-cmd-mode', isCmd);
        input.placeholder = isCmd ? 'command… (/help)' : 'Message agent… ( / for commands )';
    },

    append(role, text, meta) {
        this._log.push({ role, text: String(text), meta, at: Date.now() });
        if (this._log.length > LOG_MAX) this._log = this._log.slice(-LOG_MAX);
        ViewPrefs.set(PREFS_KEY, this._log);
        this.renderLog();
    },

    renderLog() {
        const el = document.getElementById('game-chat-log');
        if (!el) return;
        if (!this._log.length) {
            el.innerHTML = '<p class="game-chat-hint">Press <strong>T</strong> anytime · <code>/help</code> for commands</p>';
            return;
        }
        el.innerHTML = this._log.map((m) => {
            const cls = `game-chat-line game-chat-${m.role}`;
            const meta = m.meta ? `<span class="game-chat-meta">${esc(m.meta)}</span>` : '';
            return `<div class="${cls}">${esc(m.text)}${meta}</div>`;
        }).join('');
        this.scrollLog();
    },

    scrollLog() {
        const el = document.getElementById('game-chat-log');
        if (el) el.scrollTop = el.scrollHeight;
    },

    async submit() {
        const input = document.getElementById('game-chat-input');
        const text = input?.value?.trim();
        if (!text || this._busy) return;

        if (text.startsWith('/')) {
            this.append('cmd', text);
            const result = runCommand(text);
            if (result.ok) {
                this.append('system', `✓ /${result.cmd}`);
            } else {
                this.append('system', result.error || 'Command failed');
            }
            if (input) input.value = '';
            this.updatePrefix();
            return;
        }

        this.append('user', text);
        if (input) input.value = '';

        if (!window.AgentPortal?.isConnected?.()) {
            this.append('system', 'No agent connected — /setup or /agent to connect');
            return;
        }

        this._busy = true;
        try {
            const routed = await IntentRouter.classifyAndRoute(text, { useLlm: true });
            const { classification, dispatch, provider, model } = routed;

            if (dispatch && !dispatch.fallbackNpc) {
                const label = classification.intent.toUpperCase();
                const meta = provider === 'keyword' ? 'router/keyword' : `${provider}/${model || 'intent'}`;
                this.append('system', `→ ${label}: ${dispatch.message || 'routed'}`, meta);
                return;
            }

            const result = await AgentRouter.runTask('npc_chat', {
                message: text,
                systemOverride: `You are Threshold in-game assistant. Short replies (1-2 sentences). User is in the 3D world. Suggest /commands when helpful.`,
            });
            this.append('agent', result.text || '…', `${result.provider}/${result.model}`);
        } catch (e) {
            this.append('system', e.message || 'Agent unavailable');
        } finally {
            this._busy = false;
        }
    },
};

window.GameChat = GameChat;