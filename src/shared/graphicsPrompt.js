import { ViewPrefs } from './viewPrefs.js';
import { GraphicsProfile } from './graphicsProfile.js';
import { SceneDock } from './sceneDock.js';
import { getRenderMode } from './renderModes.js';

export const GraphicsPrompt = {
    root: null,

    startIfNeeded() {
        if (ViewPrefs.get('graphicsTierPrompted', false)) return false;
        setTimeout(() => this.show(), 400);
        return true;
    },

    show() {
        this.root = document.getElementById('engine-graphics-prompt');
        if (!this.root) return;
        const detected = window.State?.graphicsDetectedTier || GraphicsProfile.detect();
        const tier = GraphicsProfile.getTier(detected);
        const meta = getRenderMode(tier.renderMode);

        const title = document.getElementById('graphics-prompt-title');
        const body = document.getElementById('graphics-prompt-body');
        const select = document.getElementById('graphics-prompt-tier');

        if (title) title.textContent = `Suggested: ${tier.label}`;
        if (body) {
            body.innerHTML = `We detected a <strong>${tier.label}</strong> device. `
                + `${tier.description}<br><br>`
                + `Default: <strong>realistic PBR</strong> lighting &amp; textures. `
                + `Retro styles are optional in <strong>SCENE → ENV → Style</strong>.`;
        }
        if (select) {
            select.innerHTML = GraphicsProfile.listTiers().map((t) =>
                `<option value="${t.id}"${t.id === detected ? ' selected' : ''}>${t.label}</option>`
            ).join('');
        }

        this.bindOnce();
        this.root.classList.remove('hidden');
    },

    bindOnce() {
        if (this.root?.dataset.bound) return;
        if (this.root) this.root.dataset.bound = '1';

        document.getElementById('graphics-prompt-accept')?.addEventListener('click', () => this.accept());
        document.getElementById('graphics-prompt-env')?.addEventListener('click', () => this.openEnv());
        document.getElementById('graphics-prompt-skip')?.addEventListener('click', () => this.accept(true));
    },

    selectedTier() {
        const select = document.getElementById('graphics-prompt-tier');
        return select?.value || window.State?.graphicsDetectedTier || 'balanced';
    },

    accept(useDetectedOnly = false) {
        const tierId = useDetectedOnly
            ? (window.State?.graphicsDetectedTier || GraphicsProfile.detect())
            : this.selectedTier();
        GraphicsProfile.apply(tierId);
        ViewPrefs.set('graphicsTierPrompted', true);
        this.hide();
    },

    openEnv() {
        const tierId = this.selectedTier();
        GraphicsProfile.apply(tierId);
        ViewPrefs.set('graphicsTierPrompted', true);
        SceneDock.openTab('env');
        this.hide();
        window.UI?.status?.('Graphics tier applied — realistic PBR default; retro opt-in under Style');
    },

    hide() {
        this.root?.classList.add('hidden');
    },
};

window.GraphicsPrompt = GraphicsPrompt;