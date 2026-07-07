/**
 * Model capability matrix — tier fit, device RAM, benchmark overlay.
 * States: ok (green) · warn (yellow strain) · fail (red cannot perform)
 */

import registry from '../../config/models-registry.json';
import { AgentBenchmark } from './agentBenchmark.js';
import { TIER_GUIDE } from './agentModelGuide.js';

const TIER_MIN_B = { small: 1, medium: 1.5, large: 7 };
const SIZE_GB = [
    [/70b|72b/i, 42],
    [/32b/i, 20],
    [/13b|14b/i, 8],
    [/8b/i, 5],
    [/7b/i, 4.7],
    [/4b/i, 2.5],
    [/3b/i, 2],
    [/1\.5b|1_5b/i, 1],
];

function parseParamBillions(name) {
    const n = String(name || '').toLowerCase();
    const m = n.match(/(\d+(?:\.\d+)?)\s*b/);
    if (m) return parseFloat(m[1]);
    if (n.includes('threshold-large') || n.includes('llama3.1:8b')) return 8;
    if (n.includes('threshold-dev') || n.includes('7b')) return 7;
    if (n.includes('threshold-mini') || n.includes('3b')) return 3;
    if (n.includes('1.5b')) return 1.5;
    return 3;
}

function estimateSizeGb(name) {
    const n = String(name || '').toLowerCase();
    for (const reg of registry.mini || []) {
        if (n.includes(reg.id)) return reg.baseSizeGb || 2;
    }
    for (const reg of registry.large || []) {
        if (n.includes(reg.id)) return reg.baseSizeGb || 5;
    }
    for (const [re, gb] of SIZE_GB) {
        if (re.test(n)) return gb;
    }
    return parseParamBillions(n) * 0.65;
}

export function getDeviceProfile() {
    const ramGb = navigator.deviceMemory || 8;
    const cores = navigator.hardwareConcurrency || 4;
    let deviceClass = 'mid';
    if (ramGb <= 4 || cores <= 4) deviceClass = 'low';
    else if (ramGb >= 16 && cores >= 8) deviceClass = 'high';
    return { ramGb, cores, deviceClass, label: `${ramGb}GB RAM · ${cores} cores` };
}

function benchmarkWeak(model, tier) {
    const last = AgentBenchmark.getLastResults();
    if (!last?.rows?.length) return null;
    const rows = last.rows.filter((r) => r.model === model && r.tier === tier && !r.error);
    if (!rows.length) return null;
    const ok = rows.every((r) => r.ok);
    const avgPct = rows.reduce((s, r) => s + (r.max ? (100 * r.score) / r.max : 0), 0) / rows.length;
    if (!ok || avgPct < 55) return `Benchmark weak (${Math.round(avgPct)}%) on ${tier} tasks`;
    return null;
}

function tierCapability(model, tierId) {
    const n = String(model || '').toLowerCase();
    const b = parseParamBillions(model);

    if (tierId === 'small') {
        if (n.includes('threshold-mini-npc') || n.includes('mini-npc')) {
            return { state: 'ok', reason: 'Threshold mini — tuned for chat' };
        }
        if (b >= 1) return { state: 'ok', reason: TIER_GUIDE.small.when };
        return { state: 'fail', reason: 'Too small for reliable chat' };
    }

    if (tierId === 'medium') {
        if (n.includes('threshold-mini-dev') || n.includes('mini-dev')) {
            return { state: 'ok', reason: 'Threshold mini — tuned for patches' };
        }
        if (/coder|dev|code|qwen2\.5-coder/.test(n) && b >= 1.5) {
            return { state: 'ok', reason: 'Coder model — good for patches' };
        }
        if (b >= 3) return { state: 'warn', reason: 'Works but a coder/mini-dev model is faster' };
        if (b >= TIER_MIN_B.medium) return { state: 'warn', reason: 'Marginal for code patches' };
        return { state: 'fail', reason: 'Cannot patch code — need 1.5B+ coder or threshold-mini-dev' };
    }

    if (tierId === 'large') {
        if (n.includes('threshold-dev') || n.includes('threshold-large-scenes')) {
            return { state: 'ok', reason: 'Threshold scene model — full IIFEs' };
        }
        if (/deepseek-r1|llama3\.1:8|8b/.test(n) && b >= 7) {
            return { state: 'ok', reason: 'Large enough for scene scripts' };
        }
        if (b >= 7) return { state: 'warn', reason: 'May work — threshold-dev scores better on scenes' };
        if (b >= 4) return { state: 'fail', reason: 'Too small for full world scripts — use 7B+ or Grok' };
        return { state: 'fail', reason: 'Cannot generate full scenes — use Grok or pull threshold-dev' };
    }

    return { state: 'warn', reason: 'Unknown tier fit' };
}

function deviceStrain(model, device = getDeviceProfile()) {
    const sizeGb = estimateSizeGb(model);
    const ratio = sizeGb / Math.max(device.ramGb, 1);
    if (ratio > 0.85) {
        return { state: 'fail', reason: `Needs ~${sizeGb.toFixed(1)}GB — device reports ${device.ramGb}GB RAM` };
    }
    if (ratio > 0.45 || (device.deviceClass === 'low' && sizeGb > 3)) {
        return { state: 'warn', reason: `May struggle on ${device.ramGb}GB RAM (~${sizeGb.toFixed(1)}GB model)` };
    }
    return { state: 'ok', reason: `Fits ${device.label}` };
}

function mergeWorst(...assessments) {
    const order = { fail: 3, warn: 2, ok: 1 };
    let worst = { state: 'ok', reason: '' };
    for (const a of assessments) {
        if (!a) continue;
        if (order[a.state] > order[worst.state]) worst = a;
        else if (a.state === worst.state && a.reason) worst = a;
    }
    return worst;
}

export function assessModel(model, tierId, opts = {}) {
    const installed = opts.installed || [];
    const device = opts.device || getDeviceProfile();

    if (!model || model === 'grok' || model === 'auto') {
        return { state: 'ok', reason: 'Auto/cloud routing', model, tier: tierId };
    }

    if (!installed.includes(model)) {
        return { state: 'fail', reason: 'Not installed — ollama pull on this PC', model, tier: tierId };
    }

    const merged = mergeWorst(
        tierCapability(model, tierId),
        deviceStrain(model, device),
        benchmarkWeak(model, tierId) ? { state: 'warn', reason: benchmarkWeak(model, tierId) } : null,
    );

    return { ...merged, model, tier: tierId, sizeGb: estimateSizeGb(model), paramsB: parseParamBillions(model) };
}

export function assessTierPrefs(prefs, installed, device) {
    const out = {};
    ['small', 'medium', 'large'].forEach((tier) => {
        const pref = prefs[tier] || 'auto';
        if (pref === 'auto' || pref === 'grok') {
            out[tier] = { state: 'ok', reason: pref === 'grok' ? 'Cloud Grok' : 'Auto-pick installed', model: pref };
            return;
        }
        out[tier] = assessModel(pref, tier, { installed, device });
    });
    return out;
}

export function buildModelMatrix(installed, device = getDeviceProfile()) {
    if (!installed?.length) return { models: [], device, rows: [] };
    const rows = installed.map((model) => {
        const tiers = {};
        ['small', 'medium', 'large'].forEach((t) => {
            tiers[t] = assessModel(model, t, { installed, device });
        });
        return { model, tiers, device: deviceStrain(model, device), sizeGb: estimateSizeGb(model) };
    }).sort((a, b) => a.model.localeCompare(b.model));
    return { models: installed, device, rows };
}

export function renderMatrixHtml(matrix, opts = {}) {
    const { rows, device } = matrix;
    if (!rows?.length) {
        return '<p class="insert-hint">No Ollama models — install threshold-mini or ollama pull.</p>';
    }
    const cell = (a) => {
        const cls = a.state === 'fail' ? 'model-cap-fail' : (a.state === 'warn' ? 'model-cap-warn' : 'model-cap-ok');
        const icon = a.state === 'fail' ? '✗' : (a.state === 'warn' ? '⚠' : '✓');
        return `<span class="model-cap-cell ${cls}" title="${a.reason || ''}">${icon}</span>`;
    };
    const header = opts.compact ? '' : `<p class="insert-hint model-cap-device">Device: <strong>${device.label}</strong> — red ✗ cannot · yellow ⚠ strain</p>`;
    return `${header}<table class="model-cap-matrix"><thead><tr><th>Model</th><th>Small</th><th>Med</th><th>Large</th><th>PC</th></tr></thead><tbody>${rows.map((r) => `
        <tr><td><code>${r.model}</code><span class="model-cap-size">~${r.sizeGb.toFixed(1)}GB</span></td>
        <td>${cell(r.tiers.small)}</td><td>${cell(r.tiers.medium)}</td><td>${cell(r.tiers.large)}</td><td>${cell(r.device)}</td></tr>`).join('')}</tbody></table>`;
}

export function countDistinctLocalModels(prefs) {
    const set = new Set();
    ['small', 'medium', 'large'].forEach((t) => {
        const m = prefs[t];
        if (m && m !== 'auto' && m !== 'grok') set.add(m);
    });
    return set.size;
}