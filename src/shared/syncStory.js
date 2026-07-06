/** Sprint G — in-UI sync story (what syncs vs local-only) */

import { AudioManifestSync } from './audioManifestSync.js';
import { TextureManifestSync } from './textureManifestSync.js';

const SECTIONS = [
    {
        title: 'Live sync (host → guests)',
        className: 'sync-story-live',
        items: [
            'Player transforms, walk/TPS poses, vehicle claims',
            'Weather intensity, wind gusts, thunder events',
            'Graphics tier + render mode (on FULL_STATE)',
            'TC Circuit lap state, checkpoints, timers',
            'Pause / PLAY state and control mode',
        ],
    },
    {
        title: 'World snapshot (FULL_STATE on join + edits)',
        className: 'sync-story-world',
        items: [
            'Scene objects, transforms, GLTF paths, scripts',
            'Environment: time of day, fog, water, atmosphere',
            'Host bindings pushed to guests',
            'Admin list and session metadata',
        ],
    },
    {
        title: 'Local only (each device)',
        className: 'sync-story-local',
        items: [
            'Recorded SFX blobs — host pushes custom clips on join',
            'GIMP texture blobs — host pushes custom tex_* on join (Sprint H)',
            'Local agent configs and PromptGen drafts',
            'Scene undo history ring buffer',
        ],
    },
    {
        title: 'Host-only actions',
        className: 'sync-story-host',
        items: [
            'Pause world · EXPORT snapshot · SAVE WORLD',
            'Grant/revoke admin · push control bindings',
            'PromptGen / Compiler runs that mutate the scene (guests need admin)',
            'Scene lock — host-only edits when enabled (Sprint H)',
            'AI run ack — guest compiler/Grok runs queue for host approve (Sprint H)',
        ],
    },
];

function renderBody() {
    const Network = window.Network;
    const mode = Network?.mode || 'solo';
    const audio = AudioManifestSync.getGuestStatus();

    const lines = [`<p class="sync-story-mode">Session: <strong>${mode.toUpperCase()}</strong></p>`];

    SECTIONS.forEach((sec) => {
        lines.push(`<p class="sync-story-section ${sec.className}"><strong>${sec.title}</strong></p><ul>`);
        sec.items.forEach((item) => { lines.push(`<li>${item}</li>`); });
        lines.push('</ul>');
    });

    if (audio && (mode === 'guest' || mode === 'spectate')) {
        lines.push(
            `<p class="sync-story-audio"><strong>Custom audio</strong> — `
            + `${audio.received}/${audio.total} clips local`
            + (audio.missing ? ` · <span class="sync-story-warn">${audio.missing} pending</span>` : ' · synced')
            + '</p>'
        );
    }

    const tex = TextureManifestSync.getGuestStatus();
    if (tex && (mode === 'guest' || mode === 'spectate')) {
        lines.push(
            `<p class="sync-story-audio"><strong>Custom textures</strong> — `
            + `${tex.received}/${tex.total} blobs local`
            + (tex.missing ? ` · <span class="sync-story-warn">${tex.missing} pending</span>` : ' · synced')
            + '</p>'
        );
    }

    if (window.CollaborateGuard?.sceneLocked) {
        lines.push('<p class="sync-story-note"><strong>Scene locked</strong> — only host can mutate world until unlocked in PLAYERS panel.</p>');
    }
    if (window.CollaborateGuard?.requireAiAck && mode === 'guest') {
        lines.push('<p class="sync-story-note">Compiler / Grok runs from guests queue for host approval.</p>');
    }

    if (mode === 'spectate') {
        lines.push('<p class="sync-story-note">Spectators are read-only — follow host cam in SPECTATE tab.</p>');
    }

    lines.push(window.GuestRebuildTelemetry?.renderSyncStoryLines?.() || '');
    lines.push(window.HostMigration?.renderSyncStoryLines?.() || '');
    lines.push('<p class="sync-story-foot">Trusted small groups (2–4). Host must stay online. NAT may block some joins. Use SAVE &amp; HANDOFF before host leaves.</p>');
    return lines.join('');
}

export const SyncStory = {
    bindOnce() {
        const modal = document.getElementById('sync-story-modal');
        if (!modal || modal.dataset.bound) return;
        modal.dataset.bound = '1';

        document.getElementById('sync-story-close')?.addEventListener('click', () => this.close());
        document.getElementById('sync-story-dismiss')?.addEventListener('click', () => this.close());
        document.getElementById('btn-sync-story')?.addEventListener('click', () => this.open());
        document.getElementById('creator-sync-chip')?.addEventListener('click', (e) => {
            if (e.target.closest('.sync-ai-pending')) return;
            const mode = window.Network?.mode;
            if (mode && mode !== 'solo') this.open();
        });
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'sync-story-modal') this.close();
        });
    },

    open() {
        const body = document.getElementById('sync-story-body');
        if (body) body.innerHTML = renderBody();
        document.getElementById('sync-story-modal')?.classList.add('open');
    },

    close() {
        document.getElementById('sync-story-modal')?.classList.remove('open');
    },
};

window.SyncStory = SyncStory;