const DEFAULTS = {
  ollamaBase: 'http://127.0.0.1:11434',
  model: 'threshold-mini-mobile',
  systemPrompt:
    'You are Threshold mini — concise coding and intent helper for the Threshold 3D game lab. Prefer short, actionable JS/scene answers. No fluff.',
};

chrome.storage.sync.get(DEFAULTS, (cfg) => {
  document.getElementById('ollamaBase').value = cfg.ollamaBase || DEFAULTS.ollamaBase;
  document.getElementById('model').value = cfg.model || DEFAULTS.model;
  document.getElementById('system').value = cfg.systemPrompt || DEFAULTS.systemPrompt;
});

document.getElementById('save').addEventListener('click', () => {
  chrome.storage.sync.set({
    ollamaBase: document.getElementById('ollamaBase').value.trim() || DEFAULTS.ollamaBase,
    model: document.getElementById('model').value.trim() || DEFAULTS.model,
    systemPrompt: document.getElementById('system').value.trim() || DEFAULTS.systemPrompt,
  }, () => {
    document.getElementById('msg').textContent = 'Saved';
    document.getElementById('msg').className = 'msg ok';
  });
});
