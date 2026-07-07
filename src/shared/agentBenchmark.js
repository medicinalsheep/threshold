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

function suggestTierModels(rows) {
    const agg = { small: {}, medium: {}, large: {} };
    (rows || []).forEach((r) => {
        if (r.error || !r.model || r.provider === 'grok') return;
        if (!agg[r.tier]) return;
        if (!agg[r.tier][r.model]) agg[r.tier][r.model] = { score: 0, max: 0, ms: 0, n: 0 };
        const s = agg[r.tier][r.model];
        s.score += r.score;
        s.max += r.max;
        s.ms += r.ms;
        s.n += 1;
    });

    const suggested = {};
    ['small', 'medium', 'large'].forEach((tier) => {
        const ranked = Object.entries(agg[tier])
            .map(([model, s]) => ({
                model,
                pct: s.max ? Math.round((100 * s.score) / s.max) : 0,
                avgMs: s.n ? Math.round(s.ms / s.n) : 0,
            }))
            .sort((a, b) => b.pct - a.pct || a.avgMs - b.avgMs);
        if (ranked[0]) suggested[tier] = ranked[0].model;
    });
    return suggested;
}

function tiersAllAuto(prefs) {
    return ['small', 'medium', 'large'].every((t) => !prefs[t] || prefs[t] === 'auto');
}

export const AgentBenchmark = {
    getLastResults() {
        return ViewPrefs.get(RESULTS_KEY, null);
    },

    suggestTierModels,

    applySuggestedTiers(suggested, options = {}) {
        const prefs = AgentRouter.getTierPrefs();
        const patch = { ...prefs };
        let changed = false;
        ['small', 'medium', 'large'].forEach((tier) => {
            const model = suggested[tier];
            if (!model) return;
            if (options.force || !prefs[tier] || prefs[tier] === 'auto') {
                patch[tier] = model;
                changed = true;
            }
        });
        if (changed) AgentRouter.setTierPrefs(patch);
        return { patch, changed, suggested };
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

        const suggested = suggestTierModels(rows);
        const tierPrefs = AgentRouter.getTierPrefs();
        let applied = null;
        if (options.applyTiers !== false && Object.keys(suggested).length && tiersAllAuto(tierPrefs)) {
            applied = AgentBenchmark.applySuggestedTiers(suggested, { force: true });
        }

        const summary = {
            ranAt: new Date().toISOString(),
            totalScore,
            totalMax,
            pct: totalMax ? Math.round((100 * totalScore) / totalMax) : 0,
            rows,
            suggested,
            applied,
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

        const sug = summary.suggested || {};
        const sugLine = Object.keys(sug).length
            ? `<p class="insert-hint">Suggested: small→<code>${sug.small || '—'}</code> · medium→<code>${sug.medium || '—'}</code> · large→<code>${sug.large || '—'}</code></p>`
            : '';

        const appliedLine = summary.applied?.changed
            ? '<p class="insert-hint"><strong>Tiers auto-applied</strong> (all were auto) — SAVE TIERS not required.</p>'
            : (Object.keys(sug).length ? '<p class="insert-hint">Click <strong>APPLY SUGGESTED</strong> to set tier dropdowns.</p>' : '');

        return `<p class="insert-hint">Score ${summary.totalScore}/${summary.totalMax} (${summary.pct}%) · ${summary.ranAt.slice(0, 19)}</p>${sugLine}${appliedLine}<ul class="export-wizard-summary" style="font-size:0.62rem;">${lines}</ul>`;
    },
};

window.AgentBenchmark = AgentBenchmark;