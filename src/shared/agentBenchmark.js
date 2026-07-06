import benchmarkConfig from '../../config/agent-benchmark.json';
import { AgentRouter } from './agentRouter.js';
import { ViewPrefs } from './viewPrefs.js';
import { stripCodeFences } from './agentPrompts.js';

const RESULTS_KEY = 'agentBenchmarkResults';

function scoreProbe(probe, text) {
    const raw = String(text || '');
    const lower = raw.toLowerCase();
    let score = 0;
    const checks = [];

    if (raw.length >= (probe.minLength || 1)) {
        score += 1;
        checks.push('length');
    }

    const patterns = probe.expectPatterns || [];
    const hits = patterns.filter((p) => lower.includes(String(p).toLowerCase()));
    if (hits.length) {
        score += 2;
        checks.push(`patterns:${hits.join(',')}`);
    }

    if (probe.requireJs) {
        const code = stripCodeFences(raw);
        const jsOk = /World\.|PlayerController|THREE\.|function|=>/.test(code);
        if (jsOk) {
            score += 2;
            checks.push('js-shape');
        }
    }

    return { score, max: probe.requireJs ? 5 : 3, checks, preview: raw.slice(0, 80) };
}

export const AgentBenchmark = {
    getLastResults() {
        return ViewPrefs.get(RESULTS_KEY, null);
    },

    async runWorkflow(options = {}) {
        const onProgress = options.onProgress || (() => {});
        const probes = benchmarkConfig.probes || [];
        const rows = [];
        let totalScore = 0;
        let totalMax = 0;

        for (let i = 0; i < probes.length; i += 1) {
            const probe = probes[i];
            onProgress(`[${i + 1}/${probes.length}] ${probe.id} (${probe.tier})…`);
            const row = { id: probe.id, task: probe.task, tier: probe.tier, ok: false, ms: 0, score: 0, max: 0, model: '', provider: '', error: null };
            try {
                const result = await AgentRouter.runTask(probe.task, probe.payload, options.overrides || {});
                const scored = scoreProbe(probe, result.code || result.text);
                row.ok = scored.score >= Math.ceil(scored.max * 0.6);
                row.ms = result.ms;
                row.score = scored.score;
                row.max = scored.max;
                row.model = result.model;
                row.provider = result.provider;
                row.checks = scored.checks;
                row.preview = scored.preview;
                totalScore += scored.score;
                totalMax += scored.max;
            } catch (e) {
                row.error = e.message;
            }
            rows.push(row);
        }

        const summary = {
            ranAt: new Date().toISOString(),
            totalScore,
            totalMax,
            pct: totalMax ? Math.round((100 * totalScore) / totalMax) : 0,
            rows,
            tierPrefs: AgentRouter.getTierPrefs(),
        };
        ViewPrefs.set(RESULTS_KEY, summary);
        return summary;
    },

    formatSummaryHtml(summary) {
        if (!summary?.rows?.length) return '<p class="insert-hint">No benchmark yet.</p>';
        const lines = summary.rows.map((r) => {
            const status = r.error ? 'ERR' : (r.ok ? 'OK' : 'weak');
            const detail = r.error || `${r.score}/${r.max} · ${r.provider}/${r.model} · ${r.ms}ms`;
            return `<li><code>${r.id}</code> [${r.tier}] <strong>${status}</strong> — ${detail}</li>`;
        }).join('');
        return `<p class="insert-hint">Score ${summary.totalScore}/${summary.totalMax} (${summary.pct}%) · ${summary.ranAt.slice(0, 19)}</p><ul class="export-wizard-summary" style="font-size:0.62rem;">${lines}</ul>`;
    },
};

window.AgentBenchmark = AgentBenchmark;