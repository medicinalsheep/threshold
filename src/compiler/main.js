import { copyFromElement } from '../utils/clipboard.js';
import { Runtime } from '../shared/runtime.js';
import { Session } from '../shared/session.js';
import { REFERENCE_LIBRARY, REFERENCE_SECTIONS, checkCodeReadiness, getReferenceItem } from '../shared/referenceLibrary.js';

let activeSection = 'players';

export function initCompiler() {
    console.log('Initializing Compiler...');

    document.getElementById('btn-comp-transpile').addEventListener('click', () => Compiler.transpile());
    document.getElementById('btn-comp-copy').addEventListener('click', () => Compiler.copy());
    document.getElementById('btn-comp-clear').addEventListener('click', () => Compiler.clear());
    document.getElementById('btn-comp-save-script').addEventListener('click', () => Compiler.saveScript());
    document.getElementById('btn-comp-run').addEventListener('click', () => Compiler.runInEngine());
    document.getElementById('btn-comp-check')?.addEventListener('click', () => Compiler.checkReady());

    document.querySelectorAll('.ref-section-tab').forEach((tab) => {
        tab.addEventListener('click', () => Compiler.switchSection(tab.dataset.refSection));
    });

    document.getElementById('ref-library-list')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ref-id]');
        if (btn) Compiler.loadReference(activeSection, btn.dataset.refId);
    });

    window.addEventListener('threshold:code-update', (e) => {
        const el = document.getElementById('comp-running');
        if (el && e.detail?.code !== undefined) el.value = e.detail.code;
    });

    Compiler.renderLibrary();
    Compiler.syncHostDisplay();
    window.Compiler = Compiler;
}

const Compiler = {
    get input() { return document.getElementById('comp-input'); },
    get output() { return document.getElementById('comp-output'); },
    get running() { return document.getElementById('comp-running'); },
    get filename() { return document.getElementById('comp-filename'); },
    get tag() { return document.getElementById('comp-tag'); },
    get statusEl() { return document.getElementById('comp-status'); },

    syncHostDisplay() {
        const el = document.getElementById('comp-host-key');
        if (el) el.textContent = Session.hostKey || Session.playerKey || '---';
    },

    switchSection(section) {
        activeSection = section;
        document.querySelectorAll('.ref-section-tab').forEach((t) => {
            t.classList.toggle('active', t.dataset.refSection === section);
        });
        this.renderLibrary();
    },

    renderLibrary() {
        const list = document.getElementById('ref-library-list');
        if (!list) return;
        const items = REFERENCE_LIBRARY[activeSection] || [];
        list.innerHTML = items.map((item) => `
            <button type="button" class="comp-btn ref-item" data-ref-id="${item.id}">
                <strong>${item.title}</strong>
                <span class="ref-summary">${item.summary}</span>
            </button>
        `).join('');
    },

    loadReference(section, id) {
        const item = getReferenceItem(section, id);
        if (!item) return;
        this.input.value = item.code.trim();
        this.transpile();
        this.renderChecklist(item.checklist);
        const detail = document.getElementById('ref-detail');
        if (detail) {
            detail.innerHTML = `<strong>${item.title}</strong><p>${item.summary}</p>`;
        }
        this.checkReady();
    },

    renderChecklist(items) {
        const el = document.getElementById('ref-checklist');
        if (!el || !items) return;
        el.innerHTML = items.map((t) => `<li>${t}</li>`).join('');
    },

    checkReady() {
        const code = this.output.value.trim() || this.input.value.trim();
        const checks = checkCodeReadiness(code);
        const el = document.getElementById('comp-readiness');
        if (!el) return;
        const allOk = checks.every((c) => c.ok);
        el.innerHTML = checks.map((c) => `
            <div class="ready-row ${c.ok ? 'ok' : 'warn'}">${c.ok ? '✓' : '○'} ${c.label}</div>
        `).join('');
        el.classList.toggle('all-ready', allOk);
        this.statusEl.textContent = allOk ? 'READY' : 'CHECK';
        this.statusEl.style.opacity = 1;
        setTimeout(() => { this.statusEl.style.opacity = 0; }, 2000);
        return allOk;
    },

    clear() {
        this.input.value = '';
        this.output.value = '';
        document.getElementById('comp-readiness').innerHTML = '';
        document.getElementById('ref-checklist').innerHTML = '';
        document.getElementById('ref-detail').innerHTML = '';
        Runtime.setRunningCode('', 'compiler-clear');
    },

    saveScript() {
        const code = this.input.value;
        if (!code) { alert('No code to save!'); return; }

        const name = this.filename.value || 'untitled';
        const tag = this.tag.value;
        const finalName = `${tag.toLowerCase()}_${name}.js`;

        const fileContent = `/**
 * THRESHOLD SCRIPT
 * Type: ${tag}
 * Name: ${name}
 * Date: ${new Date().toLocaleDateString()}
 */
${code}`;

        const blob = new Blob([fileContent], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalName;
        a.click();
        URL.revokeObjectURL(url);
    },

    transpile() {
        let clean = this.input.value;
        clean = clean.replace(/scene\.add\([^;]+\);/g, '// handled by Engine');
        clean = clean.replace(/new THREE\.Mesh\(\s*new THREE\.BoxGeometry[^)]*\)/gi, "World.createObject('cube')");
        clean = clean.replace(/new THREE\.Mesh\(\s*new THREE\.SphereGeometry[^)]*\)/gi, "World.createObject('sphere')");

        const final = `(function() {
    try {
        ${clean}
    } catch(e) { console.error("Script Error:", e); }
})();`;

        this.output.value = final.trim();
        this.checkReady();
    },

    runInEngine() {
        const code = this.output.value.trim() || this.input.value.trim();
        if (!code) return;
        if (!this.checkReady()) {
            if (!confirm('Code readiness checks failed. Run anyway?')) return;
        }

        document.querySelector('[data-target="view-engine"]')?.click();
        setTimeout(() => {
            if (window.Actions) {
                window.Actions.dispatch('RUN_CODE', { code, source: 'compiler' });
            } else {
                Runtime.execute(code, 'compiler');
            }
        }, 150);
    },

    copy: async function () {
        try {
            await copyFromElement(this.output);
            this.statusEl.textContent = 'COPIED';
            this.statusEl.style.opacity = 1;
            setTimeout(() => { this.statusEl.style.opacity = 0; }, 2000);
        } catch {
            this.output.select();
        }
    }
};