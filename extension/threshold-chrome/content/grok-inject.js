/**
 * Content script on Grok / X pages — responds to extension messages for inject.
 * User-triggered only (popup / context menu).
 */
(function () {
  if (window.__THRESHOLD_GROK_CS__) return;
  window.__THRESHOLD_GROK_CS__ = true;

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type !== 'content-inject') return;
    try {
      const r = inject(msg.text);
      sendResponse(r);
    } catch (e) {
      sendResponse({ ok: false, error: e?.message || String(e) });
    }
    return true;
  });

  function inject(text) {
    const value = String(text || '');
    const SELECTORS = [
      'textarea[aria-label*="message" i]',
      'textarea[placeholder*="Ask" i]',
      'textarea[placeholder*="Message" i]',
      'div[contenteditable="true"][role="textbox"]',
      'div[contenteditable="true"]',
      'textarea',
      '[role="textbox"]',
    ];
    const nodes = [];
    for (const sel of SELECTORS) {
      document.querySelectorAll(sel).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 40 && r.height > 12 && r.bottom > 0 && r.top < innerHeight) {
          nodes.push({ el, y: r.bottom });
        }
      });
    }
    nodes.sort((a, b) => b.y - a.y);
    for (const { el } of nodes) {
      el.focus();
      if (el.isContentEditable || el.getAttribute('contenteditable') === 'true') {
        document.execCommand('selectAll', false, null);
        const ok = document.execCommand('insertText', false, value);
        if (!ok) {
          el.textContent = value;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
        }
        return { ok: true, method: 'contenteditable' };
      }
      if ('value' in el) {
        const proto = HTMLTextAreaElement.prototype;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        desc?.set?.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return { ok: true, method: 'textarea' };
      }
    }
    return { ok: false, error: 'chat input not found' };
  }
})();
