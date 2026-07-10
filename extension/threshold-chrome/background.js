/**
 * Threshold Bridge — service worker
 * Local Ollama (threshold-mini-mobile) + optional inject into Grok tab (user-triggered).
 */

const DEFAULTS = {
  ollamaBase: 'http://127.0.0.1:11434',
  model: 'threshold-mini-mobile',
  systemPrompt:
    'You are Threshold mini — concise coding and intent helper for the Threshold 3D game lab. Prefer short, actionable JS/scene answers. No fluff.',
};

const GROK_URL_RE = /https:\/\/(grok\.x\.ai|grok\.com|x\.com|twitter\.com)\//i;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'threshold-run-selection',
    title: 'Threshold mini: improve selection',
    contexts: ['selection'],
  });
  chrome.contextMenus.create({
    id: 'threshold-send-to-grok',
    title: 'Threshold: send clipboard/selection to Grok tab',
    contexts: ['selection', 'page'],
  });
  chrome.storage.sync.get(DEFAULTS, (cfg) => {
    chrome.storage.sync.set({ ...DEFAULTS, ...cfg });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'threshold-run-selection' && info.selectionText) {
    const text = await runMini(info.selectionText);
    if (text) await chrome.storage.session.set({ lastResult: text, lastPrompt: info.selectionText });
  }
  if (info.menuItemId === 'threshold-send-to-grok') {
    const text = info.selectionText
      || (await chrome.storage.session.get('lastResult')).lastResult
      || '';
    if (text) await injectIntoGrokTab(text);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    try {
      if (msg?.type === 'ollama-ping') {
        sendResponse(await pingOllama());
        return;
      }
      if (msg?.type === 'ollama-generate') {
        const out = await runMini(msg.prompt, msg.opts);
        sendResponse({ ok: true, text: out });
        return;
      }
      if (msg?.type === 'inject-grok') {
        const r = await injectIntoGrokTab(msg.text, { openIfMissing: msg.openIfMissing !== false });
        sendResponse(r);
        return;
      }
      if (msg?.type === 'find-grok-tab') {
        sendResponse({ tabs: await listGrokTabs() });
        return;
      }
      sendResponse({ ok: false, error: 'unknown message' });
    } catch (e) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
  })();
  return true;
});

async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(DEFAULTS, (cfg) => resolve({ ...DEFAULTS, ...cfg }));
  });
}

async function pingOllama() {
  const cfg = await getConfig();
  const bases = [
    cfg.ollamaBase,
    'http://127.0.0.1:11434',
    'http://127.0.0.1:11435',
  ];
  for (const base of [...new Set(bases)]) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/api/tags`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const models = (data.models || []).map((m) => m.name);
      return { ok: true, base, models };
    } catch {
      /* try next */
    }
  }
  return {
    ok: false,
    error: 'Ollama offline — run: ollama serve  (and npm run models:mobile if needed)',
  };
}

/**
 * @param {string} prompt
 * @param {{ model?: string, system?: string }} [opts]
 */
async function runMini(prompt, opts = {}) {
  const cfg = await getConfig();
  const ping = await pingOllama();
  if (!ping.ok) throw new Error(ping.error);

  const model = opts.model || cfg.model || 'threshold-mini-mobile';
  // Prefer exact name, then with :latest, then any name containing mini-mobile
  const names = ping.models || [];
  const resolved =
    names.find((n) => n === model || n.startsWith(`${model}:`))
    || names.find((n) => /threshold-mini-mobile/i.test(n))
    || names.find((n) => /threshold-mini/i.test(n))
    || model;

  const base = ping.base.replace(/\/$/, '');
  const body = {
    model: resolved,
    stream: false,
    options: { temperature: 0.4, num_predict: 1024 },
    messages: [
      { role: 'system', content: opts.system || cfg.systemPrompt },
      { role: 'user', content: String(prompt || '').trim() },
    ],
  };

  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Ollama ${res.status}`);
  }
  const text =
    data.message?.content
    || data.response
    || '';
  if (!String(text).trim()) throw new Error('Empty model response');
  await chrome.storage.session.set({ lastResult: text, lastPrompt: prompt, lastModel: resolved });
  return text;
}

async function listGrokTabs() {
  const tabs = await chrome.tabs.query({});
  return tabs
    .filter((t) => t.url && GROK_URL_RE.test(t.url))
    .map((t) => ({ id: t.id, url: t.url, title: t.title }));
}

/**
 * Inject text into an open Grok/x chat page (user must have tab open or we open one).
 */
async function injectIntoGrokTab(text, { openIfMissing = true } = {}) {
  const payload = String(text || '').trim();
  if (!payload) return { ok: false, error: 'Nothing to send' };

  let tabs = await listGrokTabs();
  // Prefer grok.x.ai / grok.com over plain x.com home
  tabs.sort((a, b) => {
    const score = (u) => (/grok/i.test(u) ? 0 : 1);
    return score(a.url) - score(b.url);
  });

  let tabId = tabs[0]?.id;
  if (!tabId && openIfMissing) {
    const created = await chrome.tabs.create({ url: 'https://grok.x.ai/', active: true });
    tabId = created.id;
    // Wait for content script readiness
    await sleep(2500);
  }
  if (!tabId) return { ok: false, error: 'No Grok tab open' };

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: injectTextIntoPage,
      args: [payload],
    });
    if (result?.ok) {
      await chrome.tabs.update(tabId, { active: true });
      return { ok: true, tabId, method: result.method };
    }
    return { ok: false, error: result?.error || 'Could not find Grok input on page' };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
}

/** Runs in page context via scripting.executeScript */
function injectTextIntoPage(text) {
  const SELECTORS = [
    'textarea[aria-label*="message" i]',
    'textarea[placeholder*="Ask" i]',
    'textarea[placeholder*="Message" i]',
    'textarea[placeholder*="Grok" i]',
    'div[contenteditable="true"][role="textbox"]',
    'div[contenteditable="true"][data-testid*="tweet" i]',
    'div[contenteditable="true"]',
    'textarea',
    '[role="textbox"]',
  ];

  function setNativeValue(el, value) {
    if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
      el.focus();
      // Select all + insert for contenteditable (works better with React)
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      const ok = document.execCommand('insertText', false, value);
      if (!ok) {
        el.textContent = value;
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
      }
      return true;
    }
    if ('value' in el) {
      const proto = el.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      desc?.set?.call(el, value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  // Prefer visible, bottom-most input (chat boxes are usually last)
  const candidates = [];
  for (const sel of SELECTORS) {
    document.querySelectorAll(sel).forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 12) return;
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      candidates.push({ el, y: r.bottom });
    });
  }
  candidates.sort((a, b) => b.y - a.y);

  for (const { el } of candidates) {
    try {
      el.focus();
      if (setNativeValue(el, text)) {
        return { ok: true, method: el.tagName + (el.isContentEditable ? ':ce' : '') };
      }
    } catch {
      /* try next */
    }
  }

  // Fallback: clipboard (user pastes)
  try {
    void navigator.clipboard.writeText(text);
    return { ok: false, error: 'No chat input found — copied to clipboard; paste into Grok (Ctrl+V)' };
  } catch {
    return { ok: false, error: 'No chat input found on this page' };
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
