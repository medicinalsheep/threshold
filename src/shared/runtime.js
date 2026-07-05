export const Runtime = {
    runningCode: '',
    lastError: '',

    setRunningCode(code, source = 'unknown') {
        this.runningCode = code || '';
        this.lastError = '';
        const el = document.getElementById('comp-running');
        if (el) el.value = this.runningCode;
        window.dispatchEvent(new CustomEvent('threshold:code-update', {
            detail: { code: this.runningCode, source }
        }));
    },

    execute(code, source = 'compiler') {
        const trimmed = (code || '').trim();
        if (!trimmed) return { ok: false, error: 'No code to run' };

        this.setRunningCode(trimmed, source);

        if (!window.State?.isPaused) {
            const worldMutating = /World\.(createObject|clearWorld|addCustom|spawn)|State\.objects\.push/.test(trimmed);
            const playerSafe = /PlayerController|applySkin|\.traverse\s*\(/i.test(trimmed);
            if (worldMutating && !playerSafe) {
                return { ok: false, error: 'PLAY mode — world locked. Pause (EDIT) to run world code.' };
            }
        }

        try {
            // eslint-disable-next-line no-eval
            const result = eval(trimmed);
            if (window.UI?.status) window.UI.status('Code running');
            return { ok: true, result };
        } catch (e) {
            this.lastError = e.message;
            if (window.UI?.status) window.UI.status(`Error: ${e.message}`);
            return { ok: false, error: e.message };
        }
    }
};

window.Runtime = Runtime;