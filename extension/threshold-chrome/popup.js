const $ = (id) => document.getElementById(id);

const promptEl = $('prompt');
const resultEl = $('result');
const modelEl = $('model');
const msgEl = $('msg');
const chip = $('status-chip');

function setMsg(text, kind = '') {
  msgEl.textContent = text || '';
  msgEl.className = `msg${kind ? ` ${kind}` : ''}`;
}

function setBusy(on) {
  $('btn-run').disabled = on;
  $('btn-grok').disabled = on;
  $('btn-ping').disabled = on;
}

async function send(msg) {
  return chrome.runtime.sendMessage(msg);
}

async function refreshPing() {
  chip.textContent = '…';
  chip.className = 'chip';
  const r = await send({ type: 'ollama-ping' });
  if (r?.ok) {
    chip.textContent = 'Ollama ✓';
    chip.className = 'chip ok';
    // Prefer mobile mini in dropdown if present
    const models = r.models || [];
    if (models.length) {
      const cur = modelEl.value;
      // Keep options; if current missing still ok (generate resolves)
      const has = models.some((n) => n === cur || n.startsWith(`${cur}:`));
      if (!has) {
        const mobile = models.find((n) => /mini-mobile/i.test(n));
        if (mobile) modelEl.value = mobile.split(':')[0].replace(/^medicinalsheep\//, '') === 'threshold-mini-mobile'
          ? 'threshold-mini-mobile'
          : modelEl.value;
      }
    }
    setMsg(`Connected ${r.base} · ${models.length} model(s)`, 'ok');
  } else {
    chip.textContent = 'Offline';
    chip.className = 'chip bad';
    setMsg(r?.error || 'Ollama offline', 'err');
  }
}

$('btn-ping').addEventListener('click', () => void refreshPing());

$('btn-run').addEventListener('click', async () => {
  const prompt = promptEl.value.trim();
  if (!prompt) {
    setMsg('Enter a prompt first', 'err');
    return;
  }
  setBusy(true);
  setMsg('Running local mini…');
  try {
    const r = await send({
      type: 'ollama-generate',
      prompt,
      opts: { model: modelEl.value },
    });
    if (!r?.ok) throw new Error(r?.error || 'generate failed');
    resultEl.value = r.text;
    setMsg('Done — Send to Grok tab when ready', 'ok');
  } catch (e) {
    setMsg(e.message || String(e), 'err');
  } finally {
    setBusy(false);
  }
});

$('btn-copy').addEventListener('click', async () => {
  const t = resultEl.value.trim();
  if (!t) {
    setMsg('Nothing to copy', 'err');
    return;
  }
  try {
    await navigator.clipboard.writeText(t);
    setMsg('Copied', 'ok');
  } catch {
    setMsg('Clipboard blocked', 'err');
  }
});

$('btn-grok').addEventListener('click', async () => {
  const text = resultEl.value.trim() || promptEl.value.trim();
  if (!text) {
    setMsg('Run mini first (or put text in result)', 'err');
    return;
  }
  setBusy(true);
  setMsg('Sending to Grok tab…');
  try {
    const r = await send({ type: 'inject-grok', text, openIfMissing: true });
    if (r?.ok) {
      setMsg(`Inserted into Grok tab (${r.method || 'ok'}) — review & send there`, 'ok');
    } else {
      setMsg(r?.error || 'Inject failed', 'err');
    }
  } catch (e) {
    setMsg(e.message || String(e), 'err');
  } finally {
    setBusy(false);
  }
});

$('btn-open-grok').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://grok.x.ai/' });
});

// Restore last session result
chrome.storage.session.get(['lastResult', 'lastPrompt'], (data) => {
  if (data.lastPrompt && !promptEl.value) promptEl.value = data.lastPrompt;
  if (data.lastResult) resultEl.value = data.lastResult;
});

chrome.storage.sync.get(['model'], (cfg) => {
  if (cfg.model) {
    const opt = [...modelEl.options].find((o) => o.value === cfg.model || cfg.model.startsWith(o.value));
    if (opt) modelEl.value = opt.value;
  }
});

modelEl.addEventListener('change', () => {
  chrome.storage.sync.set({ model: modelEl.value });
});

void refreshPing();
