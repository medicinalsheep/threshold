/** Sprint I — host handoff + migration when host leaves */

import { ViewPrefs } from './viewPrefs.js';
import { Persistence } from './persistence.js';
import { APP_URL } from '../config.js';

function playUrlForCode(code) {
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/[^/]*$/, '/') || '/';
    const localRoot = `${origin}${path}`;
    const published = (APP_URL || '').split('?')[0];
    const base = (published && !published.startsWith('file:'))
        ? (published.endsWith('/') ? published : `${published}/`)
        : localRoot;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}world=${encodeURIComponent(code)}&autoplay=1`;
}

export const HostMigration = {
    _bound: false,

    bindOnce() {
        if (this._bound) return;
        this._bound = true;

        document.getElementById('host-handoff-btn')?.addEventListener('click', () => {
            void this.hostSaveAndHandoff();
        });
        document.getElementById('host-migration-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('host-migration-lobby')?.addEventListener('click', () => {
            this.closeModal();
            document.getElementById('lobby-overlay')?.classList.remove('hidden');
        });
        document.getElementById('host-migration-play')?.addEventListener('click', () => {
            const handoff = this.getHandoff();
            if (handoff?.playUrl) window.open(handoff.playUrl, '_blank', 'noopener,noreferrer');
        });
        document.getElementById('host-migration-copy')?.addEventListener('click', () => {
            const handoff = this.getHandoff();
            if (!handoff?.code) return;
            navigator.clipboard?.writeText?.(handoff.playUrl || `?world=${handoff.code}`);
            window.UI?.status?.('Handoff link copied');
        });
        document.getElementById('host-migration-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'host-migration-modal') this.closeModal();
        });
    },

    getHandoff() {
        return ViewPrefs.get('lastHandoff', null);
    },

    storeHandoff(data) {
        const playUrl = data.playUrl || (data.code ? playUrlForCode(data.code) : null);
        const record = { ...data, playUrl, storedAt: Date.now() };
        ViewPrefs.set('lastHandoff', record);
        return record;
    },

    async hostSaveAndHandoff() {
        if (window.Network?.mode !== 'host') {
            window.UI?.status?.('Only host can save & handoff');
            return;
        }

        const designateKey = document.getElementById('host-handoff-player')?.value || '';
        const players = window.Network?.getPlayerList?.() || [];
        const designate = players.find((p) => p.key === designateKey);

        try {
            if (!window.State?.isPaused) {
                window.UI?.togglePause?.('Handoff snapshot');
            }

            const world = await Persistence.saveWorld(`Handoff ${new Date().toISOString().slice(0, 10)}`);
            const payload = {
                type: 'HANDOFF_SNAPSHOT',
                code: world.code,
                name: world.name,
                designateKey: designateKey || null,
                designateName: designate?.name || null,
                hostKey: window.Session?.playerKey,
                hostName: window.Session?.playerName,
                at: Date.now(),
                playUrl: playUrlForCode(world.code),
            };

            window.Network?.connections?.forEach((c) => {
                if (c.open) c.send(payload);
            });

            this.storeHandoff(payload);
            window.UI?.status?.(`Handoff saved ${world.code} — guests notified${designate ? ` · successor: ${designate.name}` : ''}`);
            this._renderHostHandoffNote(payload);
        } catch (e) {
            window.UI?.status?.(`Handoff failed: ${e.message}`);
        }
    },

    onHandoffSnapshot(data) {
        if (!data?.code) return;
        const record = this.storeHandoff(data);
        const me = String(window.Session?.playerKey || '').toUpperCase();
        const successor = record.designateKey && String(record.designateKey).toUpperCase() === me;
        if (successor) {
            window.UI?.status?.(`You are designated successor — host saved world ${record.code}. Create a new session in lobby when ready.`);
        } else {
            window.UI?.status?.(`Host handoff — world ${record.code} saved locally on snapshot`);
        }
        window.CreatorHud?.updateSync?.();
    },

    onReconnectFailed() {
        const handoff = this.getHandoff();
        this.showModal({
            reason: 'lost',
            handoff,
            roomId: window.Network?.roomId,
        });
    },

    showModal({ reason = 'lost', handoff = null, roomId = '' } = {}) {
        const body = document.getElementById('host-migration-body');
        const title = document.getElementById('host-migration-title');
        if (!body) return;

        const h = handoff || this.getHandoff();
        const me = String(window.Session?.playerKey || '').toUpperCase();
        const amSuccessor = h?.designateKey && String(h.designateKey).toUpperCase() === me;

        if (title) {
            title.textContent = reason === 'handoff' ? 'SESSION HANDOFF' : 'HOST DISCONNECTED';
        }

        const lines = [];
        if (reason === 'lost') {
            lines.push('<p>Could not reconnect to the host after 15s. Your last synced scene is still in memory.</p>');
        }

        if (h?.code) {
            lines.push(`<p><strong>Saved snapshot:</strong> <code>${h.code}</code> — ${h.name || 'Handoff world'}</p>`);
            if (amSuccessor) {
                lines.push('<p class="host-migration-success"><strong>You are the designated successor.</strong> Go to lobby → <strong>CREATE SESSION</strong> → share the new room code. Others re-join with the new link.</p>');
            } else if (h.designateName) {
                lines.push(`<p>Designated host: <strong>${h.designateName}</strong> (<code>${h.designateKey}</code>) should create the next session.</p>`);
            }
            lines.push('<p>Play the saved snapshot solo while the group reorganizes:</p>');
        } else {
            lines.push('<p>No handoff snapshot yet. Ask the host to use <strong>SAVE &amp; HANDOFF</strong> before leaving, or re-create from lobby.</p>');
        }

        if (roomId) {
            lines.push(`<p class="sync-story-foot">Previous room: <code>${roomId}</code> (PeerJS IDs cannot transfer — a new host must create a fresh session)</p>`);
        }

        body.innerHTML = lines.join('');
        document.getElementById('host-migration-play').style.display = h?.code ? 'inline-block' : 'none';
        document.getElementById('host-migration-copy').style.display = h?.code ? 'inline-block' : 'none';
        document.getElementById('host-migration-modal')?.classList.add('open');
    },

    closeModal() {
        document.getElementById('host-migration-modal')?.classList.remove('open');
    },

    _renderHostHandoffNote(payload) {
        const el = document.getElementById('host-handoff-status');
        if (!el || !payload?.code) return;
        el.textContent = `Last handoff: ${payload.code}${payload.designateName ? ` → ${payload.designateName}` : ''}`;
    },

    populateHandoffSelect() {
        const sel = document.getElementById('host-handoff-player');
        if (!sel || window.Network?.mode !== 'host') return;
        const players = (window.Network?.getPlayerList?.() || []).filter((p) => !p.self && !p.spectator);
        sel.innerHTML = '<option value="">— optional successor —</option>';
        players.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = p.key;
            opt.textContent = `${p.name} (${p.key})${p.admin ? ' · admin' : ''}`;
            sel.appendChild(opt);
        });
    },

    renderSyncStoryLines() {
        const h = this.getHandoff();
        if (!h?.code) return '';
        return `<p class="sync-story-note"><strong>Handoff</strong> — <code>${h.code}</code>${h.designateName ? ` · successor ${h.designateName}` : ''}</p>`;
    },
};

window.HostMigration = HostMigration;