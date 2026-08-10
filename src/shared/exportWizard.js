import { GameExport } from './gameExport.js';
import { ThresholdShell } from './thresholdShell.js';
import { Session } from './session.js';
import {
    EXPORT_STEPS,
    EXPORT_STEP_LABELS,
    defaultExportDraft,
    collectContentInventory,
    collectImmersiveInventory,
    ensureCreditEntries,
    validateStep,
    suggestBundleId,
    suggestAllStoreLinks,
    buildKindPacks,
    buildShipCliLines,
    buildSecretsChecklist,
} from './exportWalkthrough.js';
import { runExportPreflight, formatPreflightHtml } from './exportPreflight.js';
import profilesConfig from '../../config/store-assets.json';

const STEPS = EXPORT_STEPS;
const LICENSE_PRESETS = profilesConfig.licensePresets || [];
const DRAFT_KEY = 'threshold-export-draft-v1';

function isWebOnlyTargets(targets = {}) {
    const t = targets || {};
    return !!t.web && !t.android && !t.windows && !t.ios && !t.steam;
}

export const ExportWizard = {
    step: 0,
    draft: defaultExportDraft(),
    inventory: null,
    manifest: null,
    _maxVisited: 0,
    _lastCliText: '',

    open() {
        this.step = 0;
        this._maxVisited = 0;
        const saved = this._loadDraft();
        this.draft = defaultExportDraft({
            author: Session.playerName || saved?.author || 'Creator',
            name: saved?.name || 'My Threshold Game',
            description: saved?.description || '',
            ...(saved || {}),
        });
        if (!this.draft.branding?.bundleId || this.draft.branding.bundleId === 'com.threshold.game') {
            this.draft.branding.bundleId = suggestBundleId(this.draft.name);
        }
        // Default path stays web-only unless user restored native flags
        if (!saved?.targets) {
            this.draft.targets = { web: true, android: false, windows: false, ios: false, steam: false };
        }
        this.inventory = collectContentInventory();
        this.manifest = null;
        document.getElementById('export-wizard-modal')?.classList.add('open');
        this.render();
    },

    close() {
        this._saveDraft();
        document.getElementById('export-wizard-modal')?.classList.remove('open');
    },

    _saveDraft() {
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                name: this.draft.name,
                author: this.draft.author,
                description: this.draft.description,
                branding: this.draft.branding,
                store: this.draft.store,
                targets: this.draft.targets,
                immersive: this.draft.immersive,
                assetOpportunity: this.draft.assetOpportunity,
                includeSoundBlobs: this.draft.includeSoundBlobs,
                credits: {
                    global: this.draft.credits?.global || '',
                    // keep entry keys light — licenses/authors only
                    entries: this.draft.credits?.entries || {},
                },
            }));
        } catch { /* quota / private mode */ }
    },

    _loadDraft() {
        try {
            const raw = localStorage.getItem(DRAFT_KEY);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch {
            return null;
        }
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
        // Click progress pills to jump back (or to visited steps)
        root.querySelector('.export-wizard-progress')?.addEventListener('click', (e) => {
            const pill = e.target.closest?.('[data-wizard-step]');
            if (!pill) return;
            const idx = parseInt(pill.getAttribute('data-wizard-step'), 10);
            if (Number.isNaN(idx) || idx < 0 || idx >= STEPS.length) return;
            if (idx > this._maxVisited) {
                window.UI?.status?.('Finish earlier steps first — or use NEXT');
                return;
            }
            this.readStepFromUi();
            this._saveDraft();
            this.step = idx;
            this.render();
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

    readPacksFromUi() {
        const opp = this.draft.assetOpportunity;
        opp.registryEnabled = !!document.getElementById('export-packs-enabled')?.checked;
        opp.steam = {
            appId: document.getElementById('export-steam-app')?.value?.trim() || '',
            depotId: document.getElementById('export-steam-depot')?.value?.trim() || '',
        };
        opp.play = {
            applicationId: document.getElementById('export-play-app')?.value?.trim()
                || this.draft.branding?.bundleId
                || '',
        };
        opp.itch = {
            gameSlug: document.getElementById('export-itch-slug')?.value?.trim() || '',
        };
        document.querySelectorAll('[data-pack-id]').forEach((el) => {
            const id = el.dataset.packId;
            const field = el.dataset.packField;
            if (!id || !field || !this.draft.credits.entries[id]) return;
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
        this.draft.targets.steam = !!document.getElementById('export-target-steam')?.checked;
    },

    readImmersiveFromUi() {
        this.draft.immersive = {
            replayWeather: document.getElementById('export-immersive-weather')?.checked !== false,
            bundleAudioZones: document.getElementById('export-immersive-audio')?.checked !== false,
            bundleShaderGraphs: document.getElementById('export-immersive-shaders')?.checked !== false,
        };
    },

    readReviewFromUi() {
        this.draft.includeSoundBlobs = !!document.getElementById('export-include-sounds')?.checked;
    },

    readStepFromUi() {
        const stepId = STEPS[this.step];
        if (stepId === 'info') this.readInfoFromUi();
        if (stepId === 'branding') this.readBrandingFromUi();
        if (stepId === 'credits') this.readCreditsFromUi();
        if (stepId === 'immersive') this.readImmersiveFromUi();
        if (stepId === 'review') this.readReviewFromUi();
        if (stepId === 'targets') this.readTargetsFromUi();
        if (stepId === 'store') this.readStoreFromUi();
        if (stepId === 'packs') this.readPacksFromUi();
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
            immersive: this.draft.immersive,
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

        this._maxVisited = Math.max(this._maxVisited, this.step);

        EXPORT_STEP_LABELS.forEach((label, i) => {
            const el = document.querySelector(`[data-wizard-step="${i}"]`);
            if (el) {
                el.textContent = label;
                el.classList.toggle('active', i === this.step);
                el.classList.toggle('done', i < this.step);
                el.classList.toggle('visited', i <= this._maxVisited);
                el.title = i <= this._maxVisited ? `Go to ${label}` : `${label} (use NEXT)`;
                el.style.cursor = i <= this._maxVisited ? 'pointer' : 'default';
            }
        });

        if (back) back.disabled = this.step === 0;
        if (next) {
            next.textContent = this.step === STEPS.length - 1 ? 'DOWNLOAD' : 'NEXT';
            // Web-only on TARGETS: primary next can say skip store
            if (STEPS[this.step] === 'targets' && isWebOnlyTargets(this.draft.targets)) {
                next.textContent = 'NEXT · SHIP (web)';
            }
        }

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
            const preflight = runExportPreflight();
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
                <div class="export-preflight-inline">
                    <p class="insert-hint" style="margin-top:10px;"><strong>Preflight</strong> (same checks as EXPORT &amp; PLAY)</p>
                    ${formatPreflightHtml(preflight)}
                </div>
                <p class="insert-hint">Before native ship: <code>npm run bundle:assets</code> copies <code>textures/</code>, <code>import/</code>, <code>video/</code></p>
                ${this._renderValidation('content')}
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
                <p class="insert-hint" style="margin-top:8px;">Next: <strong>IMMERSIVE</strong> → REVIEW → TARGETS → STORE → <strong>PACKS</strong>.</p>
                ${this._renderValidation('credits')}
            `;
            return;
        }

        if (stepId === 'immersive') {
            const inv = collectImmersiveInventory();
            const imm = this.draft.immersive || {};
            const weatherLine = inv.weather?.active
                ? `Rain ON · intensity ${Math.round((inv.weather.intensity || 0) * 100)}%`
                : 'Weather off (snapshot uses last PLAY state)';
            const zoneLines = inv.audioZones.length
                ? inv.audioZones.map((z) => `<li>${escapeText(z.zoneId)} @ ${escapeText(z.name || 'mesh')} · r=${z.radius}</li>`).join('')
                : '<li>No audioZone meshes — add userData.audioZone in Compiler</li>';
            const hookLines = inv.shaderHooks.length
                ? inv.shaderHooks.map((h) => `<li>${escapeText(h.shaderHook)} on ${escapeText(h.name)}</li>`).join('')
                : '';
            const graphLines = inv.shaderGraphs.length
                ? inv.shaderGraphs.map((g) => `<li>${escapeText(g.shaderGraph || (g.shaderNodes || []).join('+'))} on ${escapeText(g.name)}</li>`).join('')
                : '';
            const slopLines = inv.slopWarnings.length
                ? inv.slopWarnings.map((w) => `<li class="export-warn-soft">${escapeText(w)}</li>`).join('')
                : '<li class="export-wizard-ok">No slop warnings — production quality looks good</li>';

            body.innerHTML = `
                <p class="insert-hint">Immersive stack preview — weather, audio zones, shader hooks/graphs ship in manifest for guest replay.</p>
                <ul class="export-wizard-summary">
                    <li><strong>Weather</strong> — ${escapeText(weatherLine)}</li>
                    <li><strong>Hooks</strong> — ${inv.counts.weatherHooks} weather · ${inv.counts.materialPresets} presets · ${inv.counts.zoneSheltered} sheltered</li>
                    <li><strong>Surface</strong> — ${inv.counts.withSurfaceType} surfaceType / ${inv.counts.exteriorFloors} exterior floors</li>
                </ul>
                <p class="insert-hint">Audio zones (${inv.audioZones.length}):</p>
                <ul class="export-wizard-summary export-wizard-scroll">${zoneLines}</ul>
                ${hookLines ? `<p class="insert-hint">Shader hooks:</p><ul class="export-wizard-summary">${hookLines}</ul>` : ''}
                ${graphLines ? `<p class="insert-hint">Shader graphs:</p><ul class="export-wizard-summary">${graphLines}</ul>` : ''}
                <p class="insert-hint">Quality scan:</p>
                <ul class="export-wizard-summary">${slopLines}</ul>
                <label class="export-wizard-check"><input type="checkbox" id="export-immersive-weather" ${imm.replayWeather !== false ? 'checked' : ''}> Bundle weather state for guest / export replay</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-immersive-audio" ${imm.bundleAudioZones !== false ? 'checked' : ''}> Include audio zone map in manifest</label>
                <label class="export-wizard-check"><input type="checkbox" id="export-immersive-shaders" ${imm.bundleShaderGraphs !== false ? 'checked' : ''}> Include shader hook + graph registry</label>
                ${this._renderValidation('immersive')}
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
            const nativeOpen = this.draft.targets.android || this.draft.targets.windows
                || this.draft.targets.ios || this.draft.targets.steam;
            const webOnly = isWebOnlyTargets(this.draft.targets);
            body.innerHTML = `
                <p class="insert-hint">Default path is <strong>Web only</strong> — fastest from idea to playable link. SHIP lists commands for checked targets only.</p>
                <label class="export-wizard-check"><input type="checkbox" id="export-target-web" ${this.draft.targets.web ? 'checked' : ''}> ${profiles.web.label}</label>
                <details class="export-native-targets" id="export-native-targets" ${nativeOpen ? 'open' : ''}>
                    <summary>Native &amp; store targets (optional)</summary>
                    <label class="export-wizard-check"><input type="checkbox" id="export-target-android" ${this.draft.targets.android ? 'checked' : ''}> ${profiles.android.label}</label>
                    <label class="export-wizard-check"><input type="checkbox" id="export-target-windows" ${this.draft.targets.windows ? 'checked' : ''}> ${profiles.windows.label}</label>
                    <label class="export-wizard-check"><input type="checkbox" id="export-target-ios" ${this.draft.targets.ios ? 'checked' : ''}> ${profiles.ios.label}</label>
                    <label class="export-wizard-check"><input type="checkbox" id="export-target-steam" ${this.draft.targets.steam ? 'checked' : ''}> ${profiles.steam.label}</label>
                    <p class="insert-hint" style="margin-top:6px;">Steam uses Windows Electron + <code>package:steam</code> · <code>docs/STEAM_RELEASE.md</code></p>
                </details>
                ${webOnly
                    ? `<p class="insert-hint export-wizard-ok" style="margin-top:10px;">Web only → NEXT jumps to <strong>SHIP</strong> (skips STORE + PACKS). Open native targets above if you need them.</p>
                       <button type="button" id="export-skip-to-ship" class="btn-sm" style="width:100%;margin-top:6px;">Skip to SHIP (web only)</button>`
                    : `<p class="insert-hint" style="margin-top:10px;">Native selected → continue through STORE + PACKS for metadata &amp; SKUs.</p>`}
                ${this._renderValidation('targets')}
            `;
            document.getElementById('export-skip-to-ship')?.addEventListener('click', () => {
                void this.jumpToShip({ webOnly: true });
            });
            // Keep next button label fresh when user toggles targets
            ['export-target-web', 'export-target-android', 'export-target-windows', 'export-target-ios', 'export-target-steam']
                .forEach((id) => {
                    document.getElementById(id)?.addEventListener('change', () => {
                        this.readTargetsFromUi();
                        this.render();
                    });
                });
            return;
        }

        if (stepId === 'store') {
            const s = this.draft.store;
            const webOnly = isWebOnlyTargets(this.draft.targets);
            body.innerHTML = `
                <p class="insert-hint">Store metadata — passed to <code>npm run store:prep</code> for privacy policy and listings.
                ${webOnly ? ' <strong>Optional for Web only</strong> — you can skip to SHIP.' : ''}</p>
                <label class="insert-hint">Contact email</label>
                <input type="email" id="export-store-contact" class="insert-input" value="${escapeAttr(s.contactEmail)}" placeholder="you@studio.com">
                <label class="insert-hint">Support URL</label>
                <input type="url" id="export-store-support" class="insert-input" value="${escapeAttr(s.supportUrl)}" placeholder="https://yoursite.com/support">
                <label class="insert-hint">Privacy policy URL (after hosting generated policy)</label>
                <input type="url" id="export-store-privacy" class="insert-input" value="${escapeAttr(s.privacyPolicyUrl)}" placeholder="https://yoursite.com/privacy">
                ${webOnly ? '<button type="button" id="export-skip-to-ship" class="btn-sm" style="width:100%;margin:8px 0;">Skip to SHIP (web only)</button>' : ''}
                ${this._renderValidation('store')}
                <p class="insert-hint" style="margin-top:8px;"><code>docs/STORE_RELEASE.md</code> · <code>docs/EXPORT_WALKTHROUGH.md</code></p>
            `;
            document.getElementById('export-skip-to-ship')?.addEventListener('click', () => {
                void this.jumpToShip({ webOnly: true });
            });
            return;
        }

        if (stepId === 'packs') {
            this.draft.credits.entries = ensureCreditEntries(this.draft, this.inventory);
            const opp = this.draft.assetOpportunity;
            const entries = Object.values(this.draft.credits.entries);
            const packs = buildKindPacks(this.draft, entries);
            const packSummary = packs.length
                ? packs.map((p) => `<li>${escapeText(p.label)} — <code>${escapeText(p.storeSku)}</code> (${p.assetIds.length} assets)</li>`).join('')
                : '<li>(no assets to pack)</li>';
            const rows = entries.length ? entries.map((e) => `
                <div class="export-pack-row">
                    <div class="export-credit-label"><strong>${escapeText(e.label || e.id)}</strong> <span class="export-credit-kind">${escapeText(e.kind)}</span></div>
                    <label class="insert-hint">Store SKU</label>
                    <input data-pack-id="${escapeAttr(e.id)}" data-pack-field="storeSku" class="insert-input" value="${escapeAttr(e.storeSku || '')}" maxlength="80" placeholder="game.texture.stone_block">
                    <label class="insert-hint">Registry URI</label>
                    <input data-pack-id="${escapeAttr(e.id)}" data-pack-field="registryUri" class="insert-input" value="${escapeAttr(e.registryUri || '')}" maxlength="200" placeholder="threshold://com.you.game/asset/…">
                </div>`).join('') : '<p class="insert-hint">Add textures, sounds, or models in Engine first.</p>';

            body.innerHTML = `
                <p class="insert-hint">Map authored assets to store products — Play IAP, Steam depot files, itch DLC, collectible registry.</p>
                <label class="export-wizard-check"><input type="checkbox" id="export-packs-enabled" ${opp.registryEnabled ? 'checked' : ''}> Enable store asset mapping in manifest</label>
                <label class="insert-hint">Steam App ID</label>
                <input type="text" id="export-steam-app" class="insert-input" value="${escapeAttr(opp.steam?.appId || '')}" placeholder="1234560">
                <label class="insert-hint">Steam Depot ID</label>
                <input type="text" id="export-steam-depot" class="insert-input" value="${escapeAttr(opp.steam?.depotId || '')}" placeholder="1234561">
                <label class="insert-hint">Play application ID (defaults to bundle ID)</label>
                <input type="text" id="export-play-app" class="insert-input" value="${escapeAttr(opp.play?.applicationId || this.draft.branding?.bundleId || '')}" maxlength="120">
                <label class="insert-hint">itch.io game slug</label>
                <input type="text" id="export-itch-slug" class="insert-input" value="${escapeAttr(opp.itch?.gameSlug || '')}" placeholder="my-threshold-game">
                <button type="button" id="export-suggest-skus" class="btn-sm" style="margin:8px 0;">SUGGEST ALL SKUs</button>
                <p class="insert-hint">Auto packs by kind:</p>
                <ul class="export-wizard-summary">${packSummary}</ul>
                <div class="export-packs-list">${rows}</div>
                <p class="insert-hint" style="margin-top:8px;"><code>npm run store:assets</code> generates platform JSON · <code>docs/STORE_ASSETS.md</code></p>
                ${this._renderValidation('packs')}
            `;
            document.getElementById('export-suggest-skus')?.addEventListener('click', () => {
                this.readPacksFromUi();
                suggestAllStoreLinks(this.draft);
                this.render();
            });
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
        const preflight = runExportPreflight();
        const t = this.draft.targets || {};
        const targetList = ['web', 'android', 'windows', 'ios', 'steam'].filter((k) => t[k]).join(', ') || 'none';
        body.innerHTML = `
            <p class="insert-hint">Manifest preview — engine v${m.engineVersion}</p>
            <ul class="export-wizard-summary">
                <li><strong>${escapeText(m.game.name)}</strong> · ${escapeText(m.branding?.bundleId || m.packaging?.capacitor?.appId)}</li>
                <li>Targets (after this step): <strong>${escapeText(targetList)}</strong>${isWebOnlyTargets(t) ? ' · web-only fast path' : ''}</li>
                <li>Assets: ${m.assetRegistry?.inventory?.objects ?? 0} obj · ${m.assetRegistry?.inventory?.sounds ?? 0} snd · ${m.assetRegistry?.inventory?.textures ?? 0} tex · ${m.videos?.length ?? 0} video</li>
                <li>Credits: ${Object.keys(m.credits?.entries || {}).length} attributed · store assets: ${m.assetRegistry?.storeAssets?.status || 'scaffold'}</li>
                <li>Graphics: ${escapeText(m.graphics?.tier || 'realistic')}</li>
                <li>Immersive: weather ${m.immersive?.weather?.active ? 'on' : 'off'} · ${m.immersive?.audioZones?.length ?? 0} audio zone(s) · ${(m.immersive?.shaderHooks?.length ?? 0) + (m.immersive?.shaderGraphs?.length ?? 0)} shader entries</li>
            </ul>
            <div class="export-preflight-inline">
                <p class="insert-hint"><strong>Preflight</strong></p>
                ${formatPreflightHtml(preflight, { maxWarn: 5, maxInfo: 4 })}
            </div>
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
        if (this.draft.targets.steam) targets.push('steam');
        const cliLines = buildShipCliLines(this.draft, filename, { secretsNote: true });
        const cliText = cliLines.join('\n');
        this._lastCliText = cliText;
        const secrets = buildSecretsChecklist(this.draft);
        const secretsHtml = secrets.map((s) => `
            <li>${s.secret ? '🔐' : '✓'} <strong>${escapeText(s.label)}</strong> — ${escapeText(s.note)}</li>
        `).join('');
        const webOnly = isWebOnlyTargets(this.draft.targets);
        const preflight = runExportPreflight();

        body.innerHTML = `
            <p class="insert-hint">${webOnly
                ? 'Web ship — download the manifest, then build for Pages (or use <strong>EXPORT &amp; PLAY</strong> for a one-click playable tab).'
                : 'Download manifest, then run the commands below on your dev machine. Only selected targets are included.'}</p>
            <ul class="export-wizard-summary">
                <li>File: <code id="export-ship-filename">${escapeText(filename)}</code>
                    <button type="button" id="export-copy-filename" class="btn-sm" style="margin-left:6px;">Copy name</button></li>
                <li>Targets: <strong>${targets.join(', ') || 'manifest only'}</strong>${webOnly ? ' · web only' : ''}</li>
                <li>Bundle ID: <code>${escapeText(m.branding?.bundleId || '')}</code></li>
                <li>Preflight: ${preflight.canProceed
                    ? (preflight.warnings.length
                        ? `<span class="export-warn-soft">${preflight.warnings.length} warning(s)</span>`
                        : '<span class="export-wizard-ok">clean</span>')
                    : `<span class="export-warn-block">${preflight.errors.length} blocker(s)</span>`}</li>
            </ul>
            <p class="insert-hint"><strong>What you need</strong> (never commit signing keys):</p>
            <ul class="export-wizard-summary">${secretsHtml}</ul>
            <div class="export-ship-cli-head">
                <p class="insert-hint" style="margin:0;"><strong>Post-download commands</strong></p>
                <button type="button" id="export-copy-cli" class="btn-sm">Copy CLI</button>
            </div>
            <pre class="export-wizard-cli" id="export-wizard-cli-block">${escapeText(cliText)}</pre>
            <p class="insert-hint">Details: <code>docs/STORE_RELEASE.md</code> · <code>docs/EXPORT_WALKTHROUGH.md</code></p>
            ${!preflight.canProceed
                ? `<div class="export-preflight-inline">${formatPreflightHtml(preflight, { maxWarn: 4, maxInfo: 2 })}</div>`
                : ''}
        `;
        this._pendingFilename = filename;
        this._pendingJson = JSON.stringify(m, null, 2);

        document.getElementById('export-copy-cli')?.addEventListener('click', () => {
            void this._copyText(this._lastCliText || cliText, 'CLI commands copied');
        });
        document.getElementById('export-copy-filename')?.addEventListener('click', () => {
            void this._copyText(filename, 'Filename copied');
        });
    },

    async _copyText(text, okStatus = 'Copied') {
        try {
            await navigator.clipboard.writeText(String(text || ''));
            window.UI?.status?.(okStatus);
        } catch {
            // Fallback select for older browsers
            const pre = document.getElementById('export-wizard-cli-block');
            if (pre) {
                const range = document.createRange();
                range.selectNodeContents(pre);
                const sel = window.getSelection();
                sel?.removeAllRanges();
                sel?.addRange(range);
            }
            window.UI?.status?.('Select text and copy (Ctrl+C)');
        }
    },

    async jumpToShip({ webOnly = false } = {}) {
        this.readStepFromUi();
        if (webOnly) {
            this.draft.targets = {
                web: true,
                android: false,
                windows: false,
                ios: false,
                steam: false,
            };
        }
        this._saveDraft();
        this.manifest = await this.buildManifest();
        this.step = STEPS.indexOf('package');
        this._maxVisited = Math.max(this._maxVisited, this.step);
        this.render();
        window.UI?.status?.(webOnly ? 'Jumped to SHIP (web only)' : 'Jumped to SHIP');
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
        import('./steamBridge.js').then(({ SteamBridge }) => {
            SteamBridge.unlock('GAME_EXPORTED');
        }).catch(() => {});
        this.close();
        return m;
    },

    async next() {
        this.readStepFromUi();
        this._saveDraft();
        const stepId = STEPS[this.step];
        const inv = this.inventory || collectContentInventory();

        // SCENE: block empty / guest via preflight
        if (stepId === 'content') {
            const pre = runExportPreflight();
            if (!pre.canProceed) {
                window.UI?.status?.(pre.errors[0] || 'Fix SCENE preflight blockers');
                this.render();
                return;
            }
        }

        const v = validateStep(stepId, this.draft, inv);
        if (v.blockers.length) {
            window.UI?.status?.(v.blockers[0]);
            this.render();
            return;
        }
        if (this.step >= STEPS.length - 1) {
            await this.download();
            return;
        }

        // Web-only: from TARGETS jump straight to SHIP (skip STORE + PACKS)
        if (stepId === 'targets' && isWebOnlyTargets(this.draft.targets)) {
            await this.jumpToShip({ webOnly: true });
            return;
        }

        this.step += 1;
        if (STEPS[this.step] === 'package' || STEPS[this.step] === 'review') {
            if (STEPS[this.step] === 'review') this.readReviewFromUi();
            this.manifest = await this.buildManifest();
        }
        if (STEPS[this.step] === 'packs') {
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
        this._saveDraft();
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

window.ExportWizard = ExportWizard;