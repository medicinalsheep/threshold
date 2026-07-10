/**
 * X feed panel — menu with reverse-chronological feed + compose post.
 */

import { XAuth } from './xAuth.js';

function esc(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function timeAgo(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return '';
    const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    return `${Math.floor(s / 86400)}d`;
}

export const XFeed = {
    _open: false,
    _loading: false,

    init() {
        if (this._bound) return;
        this._bound = true;

        document.getElementById('x-feed-close')?.addEventListener('click', () => this.close());
        document.getElementById('x-feed-backdrop')?.addEventListener('click', (e) => {
            if (e.target.id === 'x-feed-backdrop') this.close();
        });
        document.getElementById('x-feed-refresh')?.addEventListener('click', () => this.loadFeed());
        document.getElementById('x-feed-login')?.addEventListener('click', () => {
            void XAuth.login().catch((e) => window.UI?.status?.(e.message));
        });
        document.getElementById('x-post-submit')?.addEventListener('click', () => this.submitPost());
        document.getElementById('x-post-text')?.addEventListener('input', () => this._syncCount());

        document.querySelectorAll('[data-x-menu-open]').forEach((btn) => {
            if (btn.dataset.xFeedBound) return;
            btn.dataset.xFeedBound = '1';
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.toggle();
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._open) this.close();
        });

        window.addEventListener('x-auth-change', () => {
            if (this._open) this.renderShell();
        });
    },

    toggle() {
        if (this._open) this.close();
        else this.open();
    },

    open() {
        this.init();
        const el = document.getElementById('x-feed-backdrop');
        if (!el) return;
        this._open = true;
        el.classList.add('open');
        document.body.classList.add('x-feed-open');
        this.renderShell();
        if (XAuth.isLoggedIn()) void this.loadFeed();
    },

    close() {
        this._open = false;
        document.getElementById('x-feed-backdrop')?.classList.remove('open');
        document.body.classList.remove('x-feed-open');
    },

    renderShell() {
        const signedIn = XAuth.isLoggedIn();
        const user = XAuth.getUser();
        const guest = document.getElementById('x-feed-guest');
        const main = document.getElementById('x-feed-main');
        const title = document.getElementById('x-feed-title');
        const rescope = document.getElementById('x-feed-rescope');
        const postBtn = document.getElementById('x-post-submit');
        if (guest) guest.hidden = signedIn;
        if (main) main.hidden = !signedIn;
        if (title) {
            title.textContent = signedIn
                ? `X · @${user?.username || 'you'}`
                : 'X';
        }
        const needWrite = signedIn && !XAuth.canPost();
        if (rescope) {
            rescope.hidden = !needWrite;
            if (needWrite) {
                const miss = (XAuth.missingScopes() || []).join(', ') || 'tweet.write';
                rescope.innerHTML = `Posting needs <code>${esc(miss)}</code>. `
                    + `Enable scopes on <a href="https://developer.x.com" target="_blank" rel="noopener">developer.x.com</a>, `
                    + `then <button type="button" class="btn-sm" id="x-feed-relogin">Re-sign in with X</button>`;
                document.getElementById('x-feed-relogin')?.addEventListener('click', () => {
                    XAuth.logout();
                    void XAuth.login().catch((e) => window.UI?.status?.(e.message));
                });
            }
        }
        if (postBtn) {
            postBtn.title = needWrite
                ? 'Re-sign in with X after enabling tweet.write'
                : 'Post to X';
        }
        this._syncCount();
    },

    _syncCount() {
        const ta = document.getElementById('x-post-text');
        const count = document.getElementById('x-post-count');
        const btn = document.getElementById('x-post-submit');
        if (!ta || !count) return;
        const n = ta.value.length;
        count.textContent = `${n}/280`;
        count.classList.toggle('over', n > 280);
        const needWrite = XAuth.isLoggedIn() && !XAuth.canPost();
        if (btn) {
            btn.disabled = n === 0 || n > 280 || this._loading || needWrite;
            if (needWrite) btn.textContent = 'Re-sign in to post';
            else btn.textContent = 'Post';
        }
    },

    async loadFeed() {
        if (!XAuth.isLoggedIn()) return;
        const list = document.getElementById('x-feed-list');
        const status = document.getElementById('x-feed-status');
        const notice = document.getElementById('x-feed-notice');
        if (list) list.innerHTML = '<p class="x-feed-empty">Loading…</p>';
        if (status) status.textContent = 'Loading feed…';
        this._loading = true;
        this._syncCount();
        try {
            const { tweets, source, notice: n } = await XAuth.fetchFeed(25);
            if (notice) {
                notice.hidden = !n;
                notice.textContent = n || '';
            }
            if (status) {
                status.textContent = source === 'home'
                    ? `${tweets.length} posts · home`
                    : `${tweets.length} posts · yours`;
            }
            if (!list) return;
            if (!tweets.length) {
                list.innerHTML = '<p class="x-feed-empty">No posts yet.</p>';
                return;
            }
            list.innerHTML = tweets.map((t) => {
                const name = t.author?.name || 'User';
                const handle = t.author?.username ? `@${t.author.username}` : '';
                const av = t.author?.profileImageUrl
                    ? `<img class="x-feed-av" src="${esc(t.author.profileImageUrl)}" alt="">`
                    : '<span class="x-feed-av x-feed-av-ph"></span>';
                const metrics = t.metrics;
                const m = metrics
                    ? `<span class="x-feed-metrics">♡ ${metrics.like_count || 0} · ↻ ${metrics.retweet_count || 0}</span>`
                    : '';
                return `
                    <article class="x-feed-item">
                        <div class="x-feed-item-head">
                            ${av}
                            <div class="x-feed-item-meta">
                                <strong>${esc(name)}</strong>
                                <span class="x-feed-handle">${esc(handle)}</span>
                                <span class="x-feed-time">${esc(timeAgo(t.createdAt))}</span>
                            </div>
                        </div>
                        <p class="x-feed-text">${esc(t.text)}</p>
                        <div class="x-feed-item-foot">
                            ${m}
                            <a class="x-feed-open" href="${esc(t.url)}" target="_blank" rel="noopener">Open ↗</a>
                        </div>
                    </article>
                `;
            }).join('');
        } catch (e) {
            if (list) {
                list.innerHTML = `<p class="x-feed-empty x-feed-error">${esc(e.message || 'Feed failed')}</p>
                    <p class="insert-hint">Need tweet.read (+ elevated access for home). Re-sign in with X after enabling scopes in developer.x.com.</p>`;
            }
            if (status) status.textContent = 'Error';
            window.UI?.status?.(String(e.message || 'X feed failed').slice(0, 80));
        } finally {
            this._loading = false;
            this._syncCount();
        }
    },

    async submitPost() {
        const ta = document.getElementById('x-post-text');
        const text = ta?.value?.trim() || '';
        if (!text) return;
        const btn = document.getElementById('x-post-submit');
        if (btn) btn.disabled = true;
        this._loading = true;
        try {
            const post = await XAuth.createPost(text);
            if (ta) ta.value = '';
            this._syncCount();
            window.UI?.status?.(post?.id ? `Posted · ${post.id}` : 'Posted to X');
            await this.loadFeed();
        } catch (e) {
            window.UI?.status?.(String(e.message || 'Post failed').slice(0, 90));
            const status = document.getElementById('x-feed-status');
            if (status) status.textContent = e.message || 'Post failed';
            if (/403|forbidden|scope|permission/i.test(e.message || '')) {
                status && (status.textContent += ' — re-sign in after enabling tweet.write');
            }
        } finally {
            this._loading = false;
            this._syncCount();
        }
    },
};

window.XFeed = XFeed;
