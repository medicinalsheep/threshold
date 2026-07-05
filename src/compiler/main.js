import { copyFromElement } from '../utils/clipboard.js';
import { Runtime } from '../shared/runtime.js';
import { Session } from '../shared/session.js';

export function initCompiler() {
    console.log('Initializing Compiler...');

    document.getElementById('btn-comp-transpile').addEventListener('click', () => Compiler.transpile());
    document.getElementById('btn-comp-copy').addEventListener('click', () => Compiler.copy());
    document.getElementById('btn-comp-clear').addEventListener('click', () => Compiler.clear());
    document.getElementById('btn-comp-save-script').addEventListener('click', () => Compiler.saveScript());
    document.getElementById('btn-comp-run').addEventListener('click', () => Compiler.runInEngine());

    document.getElementById('btn-gen-city').addEventListener('click', () => Generator.set('city'));
    document.getElementById('btn-gen-dna').addEventListener('click', () => Generator.set('dna'));
    document.getElementById('btn-gen-wave').addEventListener('click', () => Generator.set('wave'));
    document.getElementById('btn-gen-ring').addEventListener('click', () => Generator.set('ring'));
    document.getElementById('btn-gen-chaos').addEventListener('click', () => Generator.set('chaos'));

    window.addEventListener('threshold:code-update', (e) => {
        const el = document.getElementById('comp-running');
        if (el && e.detail?.code !== undefined) el.value = e.detail.code;
    });

    Compiler.syncHostDisplay();
}

const Compiler = {
    get input() { return document.getElementById('comp-input'); },
    get output() { return document.getElementById('comp-output'); },
    get running() { return document.getElementById('comp-running'); },
    get filename() { return document.getElementById('comp-filename'); },
    get tag() { return document.getElementById('comp-tag'); },
    get statusEl() { return document.getElementById('comp-status'); },

    syncHostDisplay: function () {
        const el = document.getElementById('comp-host-key');
        if (el) el.textContent = Session.hostKey || Session.playerKey || '---';
    },

    clear: function () {
        this.input.value = '';
        this.output.value = '';
        Runtime.setRunningCode('', 'compiler-clear');
    },

    saveScript: function () {
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

    transpile: function () {
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
    },

    runInEngine: function () {
        const code = this.output.value.trim() || this.input.value.trim();
        if (!code) return;

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
            this.statusEl.style.opacity = 1;
            setTimeout(() => { this.statusEl.style.opacity = 0; }, 2000);
        } catch {
            this.output.select();
        }
    }
};

const Generator = {
    set: function (type) {
        let code = '';

        if (type === 'city') {
            code = `World.clearWorld();
const size = 6, spacing = 2;
for (let x = -size; x < size; x++) {
    for (let z = -size; z < size; z++) {
        if(Math.random() > 0.8) continue;
        const h = Math.random() * 8 + 2;
        const b = World.createObject('cube', 'bld', 0x222222, false);
        b.position.set(x * spacing, h / 2, z * spacing);
        b.scale.set(1, h, 1);
    }
}`;
        } else if (type === 'dna') {
            code = `World.clearWorld();
for (let i = 0; i < 40; i++) {
    const y = i * 0.5 + 2;
    const a = World.createObject('cube', 'dna_a', 0xff00ff, false);
    a.position.set(Math.cos(i * 0.4) * 3, y, Math.sin(i * 0.4) * 3);
    const b = World.createObject('cube', 'dna_b', 0x00aaff, false);
    b.position.set(Math.cos(i * 0.4 + Math.PI) * 3, y, Math.sin(i * 0.4 + Math.PI) * 3);
}`;
        } else if (type === 'ring') {
            code = `World.clearWorld();
for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    const obj = World.createObject('cone', 'sat', 0xffaa00, false);
    obj.position.set(Math.cos(angle) * 10, 2, Math.sin(angle) * 10);
}`;
        } else if (type === 'chaos') {
            code = `let count = 0;
const interval = setInterval(() => {
    World.createObject('cube', 'rain', Math.random() * 0xffffff, true).position.set((Math.random()-0.5)*10, 20, (Math.random()-0.5)*10);
    if(++count > 50) clearInterval(interval);
}, 100);`;
        } else if (type === 'wave') {
            code = `World.clearWorld();
for(let x=-8; x<8; x++) for(let z=-8; z<8; z++) {
    const s = World.createObject('sphere', 'dot', 0x00ff00, false);
    s.position.set(x, Math.sin(x*0.5)+Math.cos(z*0.5)+2, z);
    s.scale.set(0.2,0.2,0.2);
}`;
        } else {
            code = `World.createObject('cube');`;
        }

        Compiler.input.value = code.trim();
        Compiler.transpile();
    }
};