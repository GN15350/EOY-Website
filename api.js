const api = {
  prodUrl: 'https://eoyapi.monty.my/api',

  buildCandidates() {
    const override =
      window.localStorage.getItem('apiBase') ||
      new URLSearchParams(window.location.search).get('apiBase') ||
      window.__API_BASE_URL;

    const host = window.location.hostname;
    const sameOrigin = `${window.location.origin}/api`;
    const local = 'http://127.0.0.1:3000/api';

    const candidates = [];
    if (override) candidates.push(override.replace(/\/$/, ''));

    if (host === 'localhost' || host === '127.0.0.1') {
      candidates.push(local, sameOrigin);
    } else {
      // Cloudflared/public deployments should generally use same-origin
      // (e.g. yoursite.com/api -> tunnel/service route).
      candidates.push(sameOrigin, this.prodUrl);
    }

    return [...new Set(candidates)];
  },

  url: null,

  getTkn() {
    return localStorage.getItem('tkn');
  },

  setTkn(t) {
    localStorage.setItem('tkn', t);
    localStorage.setItem('uid', arguments[1] || '');
  },

  clr() {
    localStorage.clear();
  },

  async req(ep, opt = {}) {
    const hdrs = { 'Content-Type': 'application/json' };

    const tkn = this.getTkn();
    if (!opt.noAuth && tkn) {
      hdrs.Authorization = `Bearer ${tkn}`;
    }

    const cfg = {
      method: opt.m || 'GET',
      headers: hdrs
    };

    if (opt.body) {
      cfg.body = JSON.stringify(opt.body);
    }

    const candidates = this.buildCandidates();
    let lastErr = null;

    for (const base of candidates) {
      try {
        const res = await fetch(base + ep, cfg);
        const dat = await res.json();
        this.url = base;
        return dat;
      } catch (err) {
        lastErr = err;
      }
    }

    throw lastErr || new Error('API request failed');
  }
};

api.url = api.buildCandidates()[0] || api.prodUrl;
