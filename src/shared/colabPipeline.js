/**
 * Optional Colab cloud asset pipeline — creator/full only.
 * No Google login. No notebook code in the bundle.
 */
const PREF_KEY = 'threshold-colab-pipeline';
const EXT_URL = 'https://marketplace.visualstudio.com/items?itemName=Google.colab';
const GUIDE_URL = 'https://github.com/googlecolab/colab-vscode/wiki/User-Guide';
const FAQ_URL = 'https://research.google.com/colaboratory/faq.html#resource-limits';
const NOTEBOOK_REL = 'colab/threshold_pbr_starter.ipynb';
const DOCS_REL = 'docs/COLAB_ASSET_PIPELINE.md';

const STARTER_CELL = `# Threshold slug (same as artNaming.js)
import re
OBJECT_NAME = "Stone Block"  # Engine inspector Name
slug = re.sub(r'[^a-z0-9]+', '_', OBJECT_NAME.strip().lower()).strip('_') or 'object'
print(f'textures/{slug}_albedo.png')
print('zip → npm run colab:import -- --zip', slug + '_threshold_pbr.zip')
print('HILOD on by default; keep npm run textures:watch or reload Engine')`;

function loadPrefs() {
    try {
        return { optIn: false, ...JSON.parse(localStorage.getItem(PREF_KEY) || '{}') };
    } catch {
        return { optIn: false };
    }
}

function savePrefs(patch) {
    const next = { ...loadPrefs(), ...patch };
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
    return next;
}

function notebookUrl() {
    const live = 'https://github.com/medicinalsheep/threshold/blob/main/colab/threshold_pbr_starter.ipynb';
    return live;
}

function rawNotebookUrl() {
    return 'https://raw.githubusercontent.com/medicinalsheep/threshold/main/colab/threshold_pbr_starter.ipynb';
}

export const ColabPipeline = {
    EXT_URL,
    GUIDE_URL,
    FAQ_URL,
    NOTEBOOK_REL,
    DOCS_REL,

    getPrefs: loadPrefs,
    setOptIn(on) {
        const p = savePrefs({ optIn: !!on });
        this.syncUi();
        window.AgentStatus?.refresh?.();
        return p;
    },

    isOptedIn() {
        return !!loadPrefs().optIn;
    },

    chip() {
        if (!this.isOptedIn()) return null;
        if (window.SurfaceProfile?.isPlayer?.()) return null;
        return {
            id: 'colab',
            label: 'Colab ✓',
            state: 'ok',
            detail: 'Opted in — T4 when Colab offers it. Local GIMP/Blender still default.',
        };
    },

    copyStarterCell() {
        const text = STARTER_CELL;
        if (navigator.clipboard?.writeText) {
            return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
        }
        return Promise.resolve(false);
    },

    open() {
        const panel = document.getElementById('colab-pipeline-panel');
        if (panel) {
            panel.hidden = false;
            panel.querySelector('button, a, input')?.focus?.();
        }
        const details = document.getElementById('setup-colab-details');
        if (details) details.open = true;
        window.SceneDock?.openTab?.('setup');
        window.UI?.status?.('Colab pipeline — optional T4. Local GIMP/Blender unchanged.');
    },

    close() {
        const panel = document.getElementById('colab-pipeline-panel');
        if (panel) panel.hidden = true;
    },

    syncUi() {
        const on = this.isOptedIn();
        const chk = document.getElementById('colab-pipeline-optin');
        if (chk) chk.checked = on;
        const status = document.getElementById('colab-pipeline-status');
        if (status) {
            status.textContent = on
                ? 'Opted in — use VS Code Colab kernel or the starter notebook. T4 not guaranteed.'
                : 'Off — local GIMP / Blender only. Tick the box if you use Colab.';
        }
    },

    bind() {
        if (this._bound) return;
        this._bound = true;
        document.getElementById('colab-pipeline-optin')?.addEventListener('change', (e) => {
            this.setOptIn(e.target.checked);
            window.UI?.status?.(e.target.checked
                ? 'Colab opt-in on — SETUP chip when creator'
                : 'Colab opt-in off');
        });
        const openFromPortal = () => {
            window.AgentPortal?.hide?.();
            this.open();
        };
        document.getElementById('btn-open-colab-pipeline')?.addEventListener('click', () => this.open());
        document.getElementById('setup-open-colab')?.addEventListener('click', () => this.open());
        document.getElementById('agent-portal-open-colab')?.addEventListener('click', openFromPortal);
        document.getElementById('colab-pipeline-close')?.addEventListener('click', () => this.close());
        document.getElementById('colab-copy-cell')?.addEventListener('click', async () => {
            const ok = await this.copyStarterCell();
            window.UI?.status?.(ok ? 'Copied slug cell' : 'Copy failed — select the cell in the notebook');
        });
        document.getElementById('colab-pipeline-panel')?.addEventListener('click', (e) => {
            if (e.target.id === 'colab-pipeline-panel') this.close();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            const panel = document.getElementById('colab-pipeline-panel');
            if (panel && !panel.hidden) this.close();
        });
        this.syncUi();
        window.AgentStatus?.refresh?.();
    },
};

if (typeof window !== 'undefined') {
    window.ColabPipeline = ColabPipeline;
}
