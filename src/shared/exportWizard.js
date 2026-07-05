import { GameExport } from './gameExport.js';
import { ThresholdShell } from './thresholdShell.js';
import { Session } from './session.js';

const STEPS = ['info', 'review', 'targets', 'package'];

export const ExportWizard = {
    step: 0,
    draft: {
        name: 'My Threshold Game',
        author: '',
        description: '',
        includeSoundBlobs: false,
        targets: { web: true, android: true, windows: true, ios: false },
    },
    manifest: null,

    open() {
        this.step = 0;
        this.draft.author = Session.playerName || 'Creator';
        this.draft.name = `My Threshold Game`;
        this.manifest = null;
        document.getElementById('export-wizard-modal')?.classList.add('open');
        this.render();
    },

    close() {
        document.getElementById('export-wizard-modal')?.classList.remove('open');
    },

    bindOnce() {
        const root = document.getElementById('export-wizard-modal');
        if (!root || root.dataset.bound) return;
        root.dataset.bound = '1';

        document.getElementById('export-wizard-close')?.addEventListener('click', () => this.close());
        document.getElementById('export-wizard-back')?.addEventListener('click', () => this.prev());
        document.getElementById('export-wizard-next')?.addEventListener('click', () => this.next());
        root.addEventListener('click', (e) => {
            if (e.target.id === 'export-wizard-modal') this.close();
        });
    },

    readInfoFromUi() {
        this.draft.name = document.getElementById('export-wizard-name')?.value?.trim() || this.draft.name;
        this.draft.author = document.getElementById('export-wizard-author')?.value?.trim() || this.draft.author;
        this.draft.description = document.getElementById('export-wizard-desc')?.value?.trim() || '';
    },

    readTargetsFromUi() {
        this.draft.targets.web = !!document.getElementById('export-target-web')?.checked;
        this.draft.targets.android = !!document.getElementById('export-target-android')?.checked;
        this.draft.targets.windows = !!document.getElementById('export-target-windows')?.checked;
        this.draft.targets.ios = !!document.getElementById('export-target-ios')?.checked;
    },

    readReviewFromUi() {
        this.draft.includeSoundBlobs = !!document.getElementById('export-include-sounds')?.checked;
    },

    async buildManifest() {
        return GameExport.buildManifest({
            name: this.draft.name,
            author: this.draft.author,
            description: this.draft.description,
            includeSoundBlobs: this.draft.includeSoundBlobs,
            targets: { ...this.draft.targets },
        });
    },

    render() {
        const body = document.getElementById('export-wizard-body');
        const back = document.getElementById('export-wizard-back');
        const next = document.getElementById('export-wizard-next');
        if (!body) return;

        STEPS.forEach((id, i) => {
            document.querySelector(`[data-wizard-step="${i}"]`)?.classList.toggle('active', i === this.step);
        });

        if (back) back.disabled = this.step === 0;
        if (next) next.textContent = this.step === STEPS.length - 1 ? 'DOWNLOAD' : 'NEXT';

        if (this.step === 0) {
            body.innerHTML = `
                <p class="insert-hint">Name your game package. This becomes the manifest title and native app label.</p>
                <label class="insert-hint">Game name</label>
                <input type="text" id="export-wizard-name" class="insert-input" value="${escapeAttr(this.draft.name)}" maxlength="80">
                <label class="insert-hint">Author</label>
                <input type="text" id="export-wizard-author" class="insert-input" value="${escapeAttr(this.draft.author)}" maxlength="60">
                <label class="insert-hint">Description (optional)</label>
                <textarea id="export-wizard-desc" class="insert-input" rows="2" maxlength="400">${escapeText(this.draft.description)}</textarea>
            `;
            return;
        }

        if (this.step === 1) {
            body.innerHTML = `<p class="insert-hint">Building manifest preview…</p>`;
            this._renderReviewStep();
            return;
        }

        if (this.step === 2) {
            const profiles = GameExport.getBuildProfiles();
            body.innerHTML = `
                <p class="insert-hint">Choose packaging targets. Web is always ready; native shells use the same <code>dist-pages</code> build.</p>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-web" ${this.draft.targets.web ? 'checked' : ''}> ${profiles.web.label}</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-android" ${this.draft.targets.android ? 'checked' : ''}> ${profiles.android.label}</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-windows" ${this.draft.targets.windows ? 'checked' : ''}> ${profiles.windows.label}</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-ios" ${this.draft.targets.ios ? 'checked' : ''}> ${profiles.ios.label}</label>
                <p class="insert-hint" style="margin-top:10px;">CLI after download:<br>
                <code>npm run bundle:assets</code> (auto in package scripts)<br>
                <code>npm run export:graphics -- --profile android</code> (auto in package scripts)<br>
                <code>npm run package:android</code> · <code>npm run package:win</code> · <code>npm run package:ios</code><br>
                First time: <code>npm run init:native</code></p>
            `;
            return;
        }

        this._renderPackageStep();
    },

    async _renderReviewStep() {
        const body = document.getElementById('export-wizard-body');
        if (!body) return;
        this.readReviewFromUi();
        this.manifest = await this.buildManifest();
        const objCount = this.manifest.world?.objects?.length ?? 0;
        const soundCount = this.manifest.sounds?.length ?? 0;
        const texCount = this.manifest.textures?.length ?? 0;
            const hilodGroups = this.manifest.graphics?.textures?.length ?? 0;
            const gltfCount = (this.manifest.world?.objects || []).filter(
                (o) => o.type === 'gltf' || o.userData?.type === 'gltf'
            ).length;
            const lodModelCount = (this.manifest.models || []).filter((m) => m.lods?.length > 1).length;
        const hasScripts = !!(this.manifest.scripts?.running || this.manifest.scripts?.output);
        const hasGimp = !!this.manifest.gimp;
        const hasBlender = !!this.manifest.blender;
        const soundSidecar = this.draft.includeSoundBlobs;
        body.innerHTML = `
            <p class="insert-hint">Manifest preview — engine v${this.manifest.engineVersion}</p>
            <ul class="export-wizard-summary">
                <li><strong>${escapeText(this.manifest.game.name)}</strong> by ${escapeText(this.manifest.game.author)}</li>
                    <li>${objCount} world object(s)${gltfCount ? ` (${gltfCount} GLTF${lodModelCount ? `, ${lodModelCount} LOD chain(s)` : ''})` : ''}</li>
                <li>${texCount} texture map reference(s)${hilodGroups ? ` (${hilodGroups} HILOD group(s))` : ''} — ship via <code>bundle:assets</code></li>
                <li>${soundCount} sound clip reference(s)${soundSidecar ? ' (base64 embedded)' : ''}</li>
                <li>Scripts: ${hasScripts ? 'included' : 'empty (add in Compiler first)'}</li>
                <li>Creative: ${hasGimp ? 'GIMP manifest' : '—'} · ${hasBlender ? 'Blender GLTF' : '—'}</li>
                <li>Graphics: ${escapeText(this.manifest.graphics?.tier || 'realistic')} (render ${this.manifest.graphics?.renderMode ?? 4})</li>
                <li>Dev CLI: <code>textures:watch</code> · <code>blender:export</code> · <code>bundle:assets</code></li>
                <li>Relay: ${escapeText(this.manifest.relay?.mode || 'peerjs-cloud')}</li>
            </ul>
            <label class="export-wizard-check" style="margin-top:10px;">
                <input type="checkbox" id="export-include-sounds" ${this.draft.includeSoundBlobs ? 'checked' : ''}>
                Embed sound clips as base64 in manifest (larger file, portable)
            </label>
            <p class="insert-hint" style="margin-top:8px;">Textures/GLTF: run <code>npm run bundle:assets</code> before native package. Normal maps supported via GIMP SYNC.</p>
        `;
        document.getElementById('export-include-sounds')?.addEventListener('change', () => {
            this.readReviewFromUi();
            this._renderReviewStep();
        });
    },

    _renderPackageStep() {
        const body = document.getElementById('export-wizard-body');
        if (!body || !this.manifest) return;
        const m = this.manifest;
        const slug = (m.game.name || 'game').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        const filename = `${slug}.threshold-game.json`;
        const targets = [];
        if (this.draft.targets.web) targets.push('web');
        if (this.draft.targets.android) targets.push('android');
        if (this.draft.targets.windows) targets.push('windows');
        if (this.draft.targets.ios) targets.push('ios');

        body.innerHTML = `
            <p class="insert-hint">Ready to export <strong>${escapeText(m.game.name)}</strong>.</p>
            <ul class="export-wizard-summary">
                <li>File: <code>${escapeText(filename)}</code></li>
                <li>Targets: ${targets.join(', ') || 'manifest only'}</li>
                <li>Shell: ${ThresholdShell.isNative ? ThresholdShell.kind + ' (' + ThresholdShell.platform + ')' : 'browser — use CLI for APK / .exe'}</li>
                <li>Bundle: <code>bundle:assets</code> then <code>export:graphics --profile &lt;target&gt;</code> prunes textures per platform</li>
            </ul>
            <p class="insert-hint">See <code>docs/NATIVE_SHELLS.md</code> for Android Studio and Windows build steps.</p>
        `;
        this._pendingFilename = filename;
        this._pendingJson = JSON.stringify(m, null, 2);
    },

    async download() {
        this.readInfoFromUi();
        this.readTargetsFromUi();
        this.readReviewFromUi();
        const m = this.manifest || await this.buildManifest();
        const json = this._pendingJson || JSON.stringify(m, null, 2);
        const filename = this._pendingFilename || `${(m.game.name || 'game').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.threshold-game.json`;

        const nativePath = await ThresholdShell.saveManifest(filename, json);
        if (nativePath) {
            window.UI?.status(`Saved manifest → ${nativePath}`);
            this.close();
            return m;
        }

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        window.UI?.status(`Exported ${m.game.name} — run package:android, package:win, or package:ios`);
        this.close();
        return m;
    },

    async next() {
        if (this.step === 0) this.readInfoFromUi();
        if (this.step === 1) this.readReviewFromUi();
        if (this.step === 2) this.readTargetsFromUi();
        if (this.step >= STEPS.length - 1) {
            await this.download();
            return;
        }
        this.step += 1;
        if (this.step === 3) {
            this.readReviewFromUi();
            this.manifest = await this.buildManifest();
        }
        this.render();
    },

    prev() {
        if (this.step <= 0) return;
        if (this.step === 2) this.readTargetsFromUi();
        this.step -= 1;
        this.render();
    },
};

function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeText(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
}