/** Sprint H — scene lock + host-ack AI runs */

import { Session } from './session.js';
import { Sync } from './sync.js';

function isAiSource(source = '') {
    const s = String(source).toLowerCase();
    return s.includes('compiler') || s.includes('prompter') || s.includes('grok') || s === 'ai' || s === 'network';
}

export const CollaborateGuard = {
    sceneLocked: false,
    requireAiAck: true,
    _queue: [],
    _bound: false,

    captureState() {
        return {
            sceneLocked: !!this.sceneLocked,
            requireAiAck: !!this.requireAiAck,
        };
    },

    applyState(state = {}) {
        if (typeof state.sceneLocked === 'boolean') this.sceneLocked = state.sceneLocked;
        if (typeof state.requireAiAck === 'boolean') this.requireAiAck = state.requireAiAck;
        this._updateUi();
    },

    init() {
        if (this._bound) return;
        this._bound = true;

        document.getElementById('host-scene-lock')?.addEventListener('change', (e) => {
            if (window.Network?.mode !== 'host') return;
            this.sceneLocked = !!e.target.checked;
            this._broadcastCollab();
            window.UI?.status?.(this.sceneLocked ? 'Scene locked — host-only edits' : 'Scene unlocked — admins may edit');
        });
        document.getElementById('host-ai-ack')?.addEventListener('change', (e) => {
            if (window.Network?.mode !== 'host') return;
            this.requireAiAck = !!e.target.checked;
            this._broadcastCollab();
            window.UI?.status?.(this.requireAiAck ? 'AI runs require host approval' : 'AI runs auto-approved for admins');
        });
        document.getElementById('ai-run-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('ai-run-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'ai-run-modal') this.closeModal();
        });
        document.getElementById('creator-sync-chip')?.addEventListener('click', (e) => {
            if (e.target.closest('.sync-ai-pending')) {
                e.stopPropagation();
                this.openModal();
            }
        });
        document.getElementById('ai-run-queue')?.addEventListener('click', (e) => {
            const approve = e.target.closest('[data-ai-approve]');
            const deny = e.target.closest('[data-ai-deny]');
            if (approve) this.approve(approve.dataset.aiApprove);
            if (deny) this.deny(deny.dataset.aiDeny);
        });
    },

    _broadcastCollab() {
        if (window.Network?.mode === 'host') window.Network?.scheduleBroadcast?.();
        this._updateUi();
        window.CreatorHud?.updateSync?.();
    },

    shouldQueueAiRun(payload = {}, fromKey = '') {
        if (window.Network?.mode !== 'host') return false;
        if (!this.requireAiAck) return false;
        const hostKey = String(Session.playerKey || '').toUpperCase();
        if (String(fromKey || '').toUpperCase() === hostKey) return false;
        if (!isAiSource(payload.source)) return false;
        return true;
    },

    queueRun(fromKey, payload = {}, conn = null) {
        const player = window.Network?.players?.get?.(conn);
        const entry = {
            id: `airun_${Date.now().toString(36)}`,
            fromKey: String(fromKey || '').toUpperCase(),
            name: player?.name || fromKey || 'Guest',
            source: payload.source || 'compiler',
            code: String(payload.code || '').slice(0, 1200),
            at: Date.now(),
            conn,
        };
        this._queue.push(entry);
        this._renderQueue();
        this.openModal();
        window.CreatorHud?.updateSync?.();
        return entry;
    },

    approve(id) {
        const idx = this._queue.findIndex((q) => q.id === id);
        if (idx < 0) return;
        const entry = this._queue[idx];
        this._queue.splice(idx, 1);
        Sync.applyAction('RUN_CODE', {
            code: entry.code,
            source: entry.source,
            authorKey: entry.fromKey,
        });
        window.Network?.scheduleBroadcast?.();
        entry.conn?.send?.({ type: 'AI_RUN_RESULT', id, ok: true });
        window.UI?.status?.(`Approved AI run from ${entry.name}`);
        this._renderQueue();
        if (!this._queue.length) this.closeModal();
        window.CreatorHud?.updateSync?.();
    },

    deny(id, reason = 'Denied by host') {
        const idx = this._queue.findIndex((q) => q.id === id);
        if (idx < 0) return;
        const entry = this._queue.splice(idx, 1)[0];
        entry.conn?.send?.({ type: 'AI_RUN_RESULT', id, ok: false, reason });
        window.UI?.status?.(`Denied AI run from ${entry.name}`);
        this._renderQueue();
        if (!this._queue.length) this.closeModal();
        window.CreatorHud?.updateSync?.();
    },

    pendingCount() {
        return this._queue.length;
    },

    openModal() {
        if (window.Network?.mode !== 'host') return;
        document.getElementById('ai-run-modal')?.classList.add('open');
        this._renderQueue();
    },

    closeModal() {
        document.getElementById('ai-run-modal')?.classList.remove('open');
    },

    _renderQueue() {
        const el = document.getElementById('ai-run-queue');
        if (!el) return;
        if (!this._queue.length) {
            el.innerHTML = '<p class="insert-hint">No pending AI / compiler runs.</p>';
            return;
        }
        el.innerHTML = this._queue.map((q) => `
            <div class="ai-run-item">
                <div class="ai-run-meta"><strong>${q.name}</strong> <code>${q.fromKey}</code> · ${q.source}</div>
                <pre class="ai-run-preview">${q.code.slice(0, 280).replace(/</g, '&lt;')}${q.code.length > 280 ? '…' : ''}</pre>
                <div class="ai-run-actions">
                    <button type="button" class="btn-sm" data-ai-deny="${q.id}">DENY</button>
                    <button type="button" data-ai-approve="${q.id}">APPROVE &amp; RUN</button>
                </div>
            </div>
        `).join('');
    },

    _updateUi() {
        const lock = document.getElementById('host-scene-lock');
        const ack = document.getElementById('host-ai-ack');
        const isHost = window.Network?.mode === 'host';
        if (lock) {
            lock.checked = this.sceneLocked;
            lock.disabled = !isHost;
        }
        if (ack) {
            ack.checked = this.requireAiAck;
            ack.disabled = !isHost;
        }
        const guestNote = document.getElementById('host-collab-guest-note');
        if (guestNote) {
            if (window.Network?.mode === 'guest' || window.Network?.mode === 'spectate') {
                const parts = [];
                if (this.sceneLocked) parts.push('Scene locked (host-only edits)');
                if (this.requireAiAck) parts.push('AI runs need host OK');
                guestNote.textContent = parts.length ? parts.join(' · ') : 'Collaborative edit open for admins';
            } else {
                guestNote.textContent = '';
            }
        }
    },

    onGuestResult(data) {
        if (data.ok) {
            window.UI?.status?.('Host approved your AI / compiler run');
        } else {
            window.UI?.status?.(data.reason || 'Host denied AI run');
        }
    },
};

window.CollaborateGuard = CollaborateGuard;