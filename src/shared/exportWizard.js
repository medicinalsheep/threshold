import { GameExport } from './gameExport.js';
import { ThresholdShell } from './thresholdShell.js';
import { Session } from './session.js';
import {
    EXPORT_STEPS,
    EXPORT_STEP_LABELS,
    defaultExportDraft,
    collectContentInventory,
    ensureCreditEntries,
    validateStep,
    suggestBundleId,
} from './exportWalkthrough.js';
import profilesConfig from '../../config/store-assets.json';

const STEPS = EXPORT_STEPS;
const LICENSE_PRESETS = profilesConfig.licensePresets || [];

export const ExportWizard = {
    step: 0,
    draft: defaultExportDraft(),
    inventory: null,
    manifest: null,

    open() {
        this.step = 0;
        this.draft = defaultExportDraft({
            author: Session.playerName || 'Creator',
            name: 'My Threshold Game',
        });
        this.draft.branding.bundleId = suggestBundleId(this.draft.name);
        this.inventory = collectContentInventory();
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
        if (!document.getElementById('export-bundle-id')?.value) {
            this.draft.branding.bundleId = suggestBundleId(this.draft.name);
        }
    },

    readBrandingFromUi() {
        const bundle = document.getElementById('export-bundle-id')?.value?.trim();
        if (bundle) this.draft.branding.bundleId = bundle;
        this.draft.branding.iconCustomized = !!document.getElementById('export-icon-custom')?.checked;
        this.draft.branding.checklist = {
            replacedAppIcon: !!document.getElementById('export-chk-icon')?.checked,
            ranBuildIcons: !!document.getElementById('export-chk-build-icons')?.checked,
            ranCapAssets: !!document.getElementById('export-chk-cap-assets')?.checked,
        };
    },

    readCreditsFromUi() {
        this.draft.credits.global = document.getElementById('export-credits-global')?.value?.trim() || '';
        const fields = document.querySelectorAll('[data-credit-id]');
        fields.forEach((el) => {
            const id = el.dataset.creditId;
            const field = el.dataset.creditField;
            if (!id || !field) return;
            if (!this.draft.credits.entries[id]) {
                this.draft.credits.entries[id] = { id, label: id, kind: 'asset', author: '', license: '', source: '' };
            }
            this.draft.credits.entries[id][field] = el.value?.trim() || '';
        });
    },

    readStoreFromUi() {
        this.draft.store.contactEmail = document.getElementById('export-store-contact')?.value?.trim() || '';
        this.draft.store.supportUrl = document.getElementById('export-store-support')?.value?.trim() || '';
        this.draft.store.privacyPolicyUrl = document.getElementById('export-store-privacy')?.value?.trim() || '';
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

    readStepFromUi() {
        const stepId = STEPS[this.step];
        if (stepId === 'info') this.readInfoFromUi();
        if (stepId === 'branding') this.readBrandingFromUi();
        if (stepId === 'credits') this.readCreditsFromUi();
        if (stepId === 'review') this.readReviewFromUi();
        if (stepId === 'targets') this.readTargetsFromUi();
        if (stepId === 'store') this.readStoreFromUi();
    },

    async buildManifest() {
        this.inventory = collectContentInventory();
        return GameExport.buildManifest({
            name: this.draft.name,
            author: this.draft.author,
            description: this.draft.description,
            includeSoundBlobs: this.draft.includeSoundBlobs,
            targets: { ...this.draft.targets },
            bundleId: this.draft.branding?.bundleId,
            branding: this.draft.branding,
            credits: this.draft.credits,
            store: this.draft.store,
            assetOpportunity: this.draft.assetOpportunity,
        });
    },

    _renderValidation(stepId) {
        const v = validateStep(stepId, this.draft, this.inventory || collectContentInventory());
        if (!v.warnings.length && !v.blockers.length) return '';
        const lines = [
            ...v.blockers.map((w) => `<li class="export-warn-block">${escapeText(w)}</li>`),
            ...v.warnings.map((w) => `<li class="export-warn-soft">${escapeText(w)}</li>`),
        ];
        return `<ul class="export-wizard-validation">${lines.join('')}</ul>`;
    },

    render() {
        const body = document.getElementById('export-wizard-body');
        const back = document.getElementById('export-wizard-back');
        const next = document.getElementById('export-wizard-next');
        if (!body) return;

        EXPORT_STEP_LABELS.forEach((label, i) => {
            const el = document.querySelector(`[data-wizard-step="${i}"]`);
            if (el) {
                el.textContent = label;
                el.classList.toggle('active', i === this.step);
            }
        });

        if (back) back.disabled = this.step === 0;
        if (next) next.textContent = this.step === STEPS.length - 1 ? 'DOWNLOAD' : 'NEXT';

        const stepId = STEPS[this.step];
        this.inventory = collectContentInventory();

        if (stepId === 'info') {
            body.innerHTML = `
                <p class="insert-hint">Game identity — used in store listings, credits, and the manifest title.</p>
                <label class="insert-hint">Game name</label>
                <input type="text" id="export-wizard-name" class="insert-input" value="${escapeAttr(this.draft.name)}" maxlength="80">
                <label class="insert-hint">Author / studio</label>
                <input type="text" id="export-wizard-author" class="insert-input" value="${escapeAttr(this.draft.author)}" maxlength="60">
                <label class="insert-hint">Description (store listing)</label>
                <textarea id="export-wizard-desc" class="insert-input" rows="3" maxlength="400">${escapeText(this.draft.description)}</textarea>
                ${this._renderValidation('info')}
            `;
            return;
        }

        if (stepId === 'branding') {
            const b = this.draft.branding;
            const chk = b.checklist || {};
            body.innerHTML = `
                <p class="insert-hint">Icons & bundle ID — required for Play Store, App Store, and Windows.</p>
                <label class="insert-hint">Bundle ID (reverse-DNS)</label>
                <input type="text" id="export-bundle-id" class="insert-input" value="${escapeAttr(b.bundleId)}" maxlength="120" placeholder="com.studio.mygame">
                <p class="insert-hint">Replace <code>icons/appicon512.png</code> (512×512 PNG), then run CLI on your dev machine:</p>
                <label class="export-wizard-check"><input type="checkbox" id="export-icon-custom" ${b.iconCustomized ? 'checked' : ''}> I replaced the default Threshold icon with my game art</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-chk-icon" ${chk.replacedAppIcon ? 'checked' : ''}> <code>icons/appicon512.png</code> updated</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-chk-build-icons" ${chk.ranBuildIcons ? 'checked' : ''}> Ran <code>npm run build:icons</code> (Windows)</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-chk-cap-assets" ${chk.ranCapAssets ? 'checked' : ''}> Ran <code>npm run cap:assets</code> (Android/iOS)</label>
                <p class="insert-hint" style="margin-top:8px;">See <code>icons/README.md</code> and <code>docs/EXPORT_WALKTHROUGH.md</code></p>
                ${this._renderValidation('branding')}
            `;
            return;
        }

        if (stepId === 'content') {
            const inv = this.inventory;
            const objLines = inv.sceneObjects.slice(0, 12).map((o) =>
                `<li>${escapeText(o.name)} (${escapeText(o.type)})${o.gltfPath ? ` · ${escapeText(o.gltfPath)}` : ''}${o.textureHint ? ` · tex` : ''}</li>`
            ).join('');
            const more = inv.sceneObjects.length > 12 ? `<li>… +${inv.sceneObjects.length - 12} more</li>` : '';
            body.innerHTML = `
                <p class="insert-hint">Live scene inventory — what ships in <code>world</code> + creative folders.</p>
                <ul class="export-wizard-summary">
                    <li><strong>${inv.objectCount}</strong> scene object(s)</li>
                    <li><strong>${inv.textureRefs.length}</strong> texture clip(s) · <strong>${inv.models.length}</strong> GLTF · <strong>${inv.soundRefs.length}</strong> sound(s)</li>
                    <li><strong>${inv.videoRefs.length}</strong> video ref(s) · <strong>${inv.hilodGroups}</strong> HILOD group(s)</li>
                    <li>Scripts: ${inv.scripts.hasRunning ? 'running code attached' : 'none in Compiler'}</li>
                </ul>
                <p class="insert-hint">Objects (sample):</p>
                <ul class="export-wizard-summary export-wizard-scroll">${objLines || '<li>(empty scene)</li>'}${more}</ul>
                <p class="insert-hint">Before ship: <code>npm run bundle:assets</code> copies <code>textures/</code>, <code>import/</code>, <code>video/</code></p>
            `;
            return;
        }

        if (stepId === 'credits') {
            this.draft.credits.entries = ensureCreditEntries(this.draft, this.inventory);
            const entries = Object.values(this.draft.credits.entries);
            const rows = entries.length ? entries.map((e) => {
                const lic = e.license || LICENSE_PRESETS[0];
                const opts = LICENSE_PRESETS.map((l) =>
                    `<option value="${escapeAttr(l)}"${l === lic ? ' selected' : ''}>${escapeText(l)}</option>`
                ).join('');
                return `
                <div class="export-credit-row">
                    <div class="export-credit-label"><strong>${escapeText(e.label || e.id)}</strong> <span class="export-credit-kind">${escapeText(e.kind)}</span></div>
                    <label class="insert-hint">License</label>
                    <select data-credit-id="${escapeAttr(e.id)}" data-credit-field="license" class="insert-input">
                        ${opts}
                    </select>
                    <label class="insert-hint">Author / rights holder</label>
                    <input data-credit-id="${escapeAttr(e.id)}" data-credit-field="author" class="insert-input" value="${escapeAttr(e.author || this.draft.author)}" maxlength="80">
                    <label class="insert-hint">Source URL (optional)</label>
                    <input data-credit-id="${escapeAttr(e.id)}" data-credit-field="source" class="insert-input" value="${escapeAttr(e.source || '')}" maxlength="200" placeholder="https://…">
                </div>`;
            }).join('') : '<p class="insert-hint">No linked assets yet — add textures, sounds, or GLTF in Engine first.</p>';

            body.innerHTML = `
                <p class="insert-hint">Attribute every asset — stores require proof of rights. Feeds <code>credits.md</code> via <code>store:prep</code>.</p>
                <label class="insert-hint">Global credits (shown in listings / future in-game credits)</label>
                <textarea id="export-credits-global" class="insert-input" rows="2" maxlength="600" placeholder="Music by … · Textures original · Built with Threshold">${escapeText(this.draft.credits.global)}</textarea>
                <div class="export-credits-list">${rows}</div>
                <p class="insert-hint" style="margin-top:8px;">Future: <code>assetRegistry.storeAssets</code> links each asset to store SKUs / collectible registry (see EXPORT_WALKTHROUGH.md)</p>
                ${this._renderValidation('credits')}
            `;
            return;
        }

        if (stepId === 'review') {
            body.innerHTML = `<p class="insert-hint">Building manifest preview…</p>`;
            this._renderReviewStep();
            return;
        }

        if (stepId === 'targets') {
            const profiles = GameExport.getBuildProfiles();
            body.innerHTML = `
                <p class="insert-hint">Packaging targets — same <code>dist-pages</code> SPA for all.</p>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-web" ${this.draft.targets.web ? 'checked' : ''}> ${profiles.web.label}</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-android" ${this.draft.targets.android ? 'checked' : ''}> ${profiles.android.label}</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-windows" ${this.draft.targets.windows ? 'checked' : ''}> ${profiles.windows.label}</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-ios" ${this.draft.targets.ios ? 'checked' : ''}> ${profiles.ios.label}</label>
            `;
            return;
        }

        if (stepId === 'store') {
            const s = this.draft.store;
            body.innerHTML = `
                <p class="insert-hint">Store metadata — passed to <code>npm run store:prep</code> for privacy policy and listings.</p>
                <label class="insert-hint">Contact email</label>
                <input type="email" id="export-store-contact" class="insert-input" value="${escapeAttr(s.contactEmail)}" placeholder="you@studio.com">
                <label class="insert-hint">Support URL</label>
                <input type="url" id="export-store-support" class="insert-input" value="${escapeAttr(s.supportUrl)}" placeholder="https://yoursite.com/support">
                <label class="insert-hint">Privacy policy URL (after hosting generated policy)</label>
                <input type="url" id="export-store-privacy" class="insert-input" value="${escapeAttr(s.privacyPolicyUrl)}" placeholder="https://yoursite.com/privacy">
                ${this._renderValidation('store')}
                <p class="insert-hint" style="margin-top:8px;"><code>docs/STORE_RELEASE.md</code> · <code>docs/EXPORT_WALKTHROUGH.md</code></p>
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
        const m = this.manifest;
        body.innerHTML = `
            <p class="insert-hint">Manifest preview — engine v${m.engineVersion}</p>
            <ul class="export-wizard-summary">
                <li><strong>${escapeText(m.game.name)}</strong> · ${escapeText(m.branding?.bundleId || m.packaging?.capacitor?.appId)}</li>
                <li>Assets: ${m.assetRegistry?.inventory?.objects ?? 0} obj · ${m.assetRegistry?.inventory?.sounds ?? 0} snd · ${m.assetRegistry?.inventory?.textures ?? 0} tex · ${m.videos?.length ?? 0} video</li>
                <li>Credits: ${Object.keys(m.credits?.entries || {}).length} attributed · registry v${m.assetRegistry?.formatVersion ?? 1}</li>
                <li>Graphics: ${escapeText(m.graphics?.tier || 'realistic')}</li>
            </ul>
            <label class="export-wizard-check" style="margin-top:10px;">
                <input type="checkbox" id="export-include-sounds" ${this.draft.includeSoundBlobs ? 'checked' : ''}>
                Embed sound clips as base64 in manifest (larger file, portable)
            </label>
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
        const contact = this.draft.store.contactEmail ? ` --contact ${this.draft.store.contactEmail}` : '';
        const privacy = this.draft.store.privacyPolicyUrl ? ` --privacy-url ${this.draft.store.privacyPolicyUrl}` : '';

        body.innerHTML = `
            <p class="insert-hint">Download manifest, then run store prep and package CLIs on your dev machine.</p>
            <ul class="export-wizard-summary">
                <li>File: <code>${escapeText(filename)}</code></li>
                <li>Targets: ${targets.join(', ') || 'manifest only'}</li>
                <li>Bundle ID: <code>${escapeText(m.branding?.bundleId || '')}</code></li>
            </ul>
            <p class="insert-hint">Post-download commands:</p>
            <pre class="export-wizard-cli">npm run store:prep -- --manifest ${escapeText(filename)}${escapeText(contact)}${escapeText(privacy)}
npm run bundle:assets
npm run package:android:release  # or package:win / package:ios</pre>
            <p class="insert-hint">Walkthrough: <code>docs/EXPORT_WALKTHROUGH.md</code></p>
        `;
        this._pendingFilename = filename;
        this._pendingJson = JSON.stringify(m, null, 2);
    },

    async download() {
        this.readStepFromUi();
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
        window.UI?.status(`Exported ${m.game.name} — run store:prep then package:*`);
        this.close();
        return m;
    },

    async next() {
        this.readStepFromUi();
        const stepId = STEPS[this.step];
        const v = validateStep(stepId, this.draft, this.inventory || collectContentInventory());
        if (v.blockers.length) {
            window.UI?.status?.(v.blockers[0]);
            this.render();
            return;
        }
        if (this.step >= STEPS.length - 1) {
            await this.download();
            return;
        }
        this.step += 1;
        if (STEPS[this.step] === 'package' || STEPS[this.step] === 'review') {
            if (STEPS[this.step] === 'review') this.readReviewFromUi();
            this.manifest = await this.buildManifest();
        }
        if (STEPS[this.step] === 'package') {
            this.manifest = this.manifest || await this.buildManifest();
        }
        this.render();
    },

    prev() {
        if (this.step <= 0) return;
        this.readStepFromUi();
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