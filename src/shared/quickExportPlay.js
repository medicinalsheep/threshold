/** Sprint E — one-click Export & Play with preflight */

import { APP_URL, VERSION } from '../config.js';
import { runExportPreflight } from './exportPreflight.js';
import { GameExport } from './gameExport.js';
import { Persistence } from './persistence.js';
import { ViewPrefs } from './viewPrefs.js';
import { Session } from './session.js';

function gameNameFromScene() {
    const tpl = window.State?.templateId || 'wardenclyffe';
    const names = {
        wardenclyffe: 'Wardenclyffe Export',
        minimal: 'Blank Yard Export',
        'tc-circuit': 'TC Circuit Export',
        surreal: 'Surreal Seed Export',
    };
    return names[tpl] || `Threshold Game ${new Date().toISOString().slice(0, 10)}`;
}

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

function renderPreflightReport(report) {
    const lines = [];
    if (report.errors.length) {
        lines.push('<p class="preflight-section preflight-err"><strong>Errors</strong></p><ul>');
        report.errors.forEach((e) => { lines.push(`<li>${e}</li>`); });
        lines.push('</ul>');
    }
    if (report.warnings.length) {
        lines.push('<p class="preflight-section preflight-warn"><strong>Warnings</strong></p><ul>');
        report.warnings.forEach((w) => { lines.push(`<li>${w}</li>`); });
        lines.push('</ul>');
    }
    if (report.infos.length) {
        lines.push('<p class="preflight-section"><strong>Notes</strong></p><ul>');
        report.infos.forEach((i) => { lines.push(`<li>${i}</li>`); });
        lines.push('</ul>');
    }
    lines.push(`<p class="preflight-stats">${report.stats.objects} objects · ${report.stats.sounds} sounds · ${report.stats.textures} textures · ${report.stats.models} models</p>`);
    return lines.join('');
}

export const QuickExportPlay = {
    _pendingForce: false,

    bindOnce() {
        const modal = document.getElementById('export-preflight-modal');
        if (!modal || modal.dataset.bound) return;
        modal.dataset.bound = '1';

        document.getElementById('export-preflight-close')?.addEventListener('click', () => this.closeModal());
        document.getElementById('export-preflight-cancel')?.addEventListener('click', () => this.closeModal());
        document.getElementById('export-preflight-go')?.addEventListener('click', () => {
            void this.executeExport({ force: this._pendingForce });
        });
        document.getElementById('export-preflight-force')?.addEventListener('click', () => {
            void this.executeExport({ force: true });
        });
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'export-preflight-modal') this.closeModal();
        });

        document.getElementById('btn-export-play')?.addEventListener('click', () => this.start());
        document.getElementById('lobby-play-last-export')?.addEventListener('click', () => this.openLastExport());
    },

    closeModal() {
        document.getElementById('export-preflight-modal')?.classList.remove('open');
        this._pendingForce = false;
    },

    openModal(report) {
        const body = document.getElementById('export-preflight-body');
        const go = document.getElementById('export-preflight-go');
        const force = document.getElementById('export-preflight-force');
        if (body) body.innerHTML = renderPreflightReport(report);

        const hasWarnings = report.warnings.length > 0;
        const blocked = !report.canProceed;

        if (go) {
            go.style.display = blocked ? 'none' : 'inline-block';
            go.textContent = hasWarnings ? 'EXPORT & PLAY' : 'EXPORT & PLAY';
        }
        if (force) {
            force.style.display = (!blocked && hasWarnings) ? 'inline-block' : 'none';
        }

        this._pendingForce = false;
        document.getElementById('export-preflight-modal')?.classList.add('open');
    },

    async start() {
        const report = runExportPreflight();
        if (!report.canProceed) {
            this.openModal(report);
            return;
        }
        if (report.warnings.length) {
            this.openModal(report);
            return;
        }
        await this.executeExport({ force: false });
    },

    async executeExport({ force = false } = {}) {
        const report = runExportPreflight();
        if (!report.canProceed) {
            window.UI?.status?.('Export blocked — fix errors first');
            this.openModal(report);
            return;
        }
        if (report.warnings.length && !force) {
            this.openModal(report);
            return;
        }

        this.closeModal();

        const name = gameNameFromScene();
        const author = Session.playerName || 'Creator';

        try {
            if (!window.State?.isPaused) {
                window.UI?.togglePause?.('Export snapshot');
            }

            const worldRecord = await Persistence.saveWorld(name);
            const manifest = await GameExport.downloadManifest({
                name,
                author,
                description: `Quick export v${VERSION} — ${worldRecord.code}`,
                targets: { web: true, android: false, windows: false, ios: false },
            });

            const playUrl = playUrlForCode(worldRecord.code);
            ViewPrefs.set('lastExportPlay', {
                url: playUrl,
                code: worldRecord.code,
                name,
                at: Date.now(),
                warnings: report.warnings.length,
            });

            const opened = window.open(playUrl, '_blank', 'noopener,noreferrer');
            window.UI?.status?.(
                opened
                    ? `Exported ${worldRecord.code} — manifest downloaded · play tab opened`
                    : `Exported ${worldRecord.code} — allow popups to open play tab`
            );

            return { worldRecord, manifest, playUrl, preflight: report };
        } catch (e) {
            console.warn('[quick-export]', e);
            window.UI?.status?.(`Export failed: ${e.message}`);
            throw e;
        }
    },

    _status(msg, isError = false) {
        if (window.UI?.status) {
            window.UI.status(msg);
            return;
        }
        const el = document.getElementById('lobby-status');
        if (el) {
            el.textContent = msg;
            el.style.color = isError ? '#ff5555' : '#888';
        }
    },

    openLastExport() {
        const last = ViewPrefs.get('lastExportPlay', null);
        if (!last?.url) {
            this._status('No export yet — build in SOLO, then ENGINE → EXPORT & PLAY');
            return false;
        }
        const opened = window.open(last.url, '_blank', 'noopener,noreferrer');
        if (!opened) {
            this._status(`Pop-up blocked — open: ${last.url}`, true);
        }
        return true;
    },

    getLastExport() {
        return ViewPrefs.get('lastExportPlay', null);
    },
};

window.QuickExportPlay = QuickExportPlay;