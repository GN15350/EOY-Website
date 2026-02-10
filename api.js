var api = {
  prodUrl: 'https://eoyapi.monty.my/api',
  url: null,

  getOverrideBase: function () {
    var fromStorage = null;
    try {
      fromStorage = window.localStorage.getItem('apiBase');
    } catch (e) {
      fromStorage = null;
    }

    var fromQuery = null;
    try {
      if (window.URLSearchParams) {
        fromQuery = new URLSearchParams(window.location.search).get('apiBase');
      }
    } catch (e) {
      fromQuery = null;
    }

    var fromGlobal = typeof window.__API_BASE_URL === 'string' ? window.__API_BASE_URL : null;
    return fromStorage || fromQuery || fromGlobal || null;
  },

  normalizeBase: function (base) {
    if (!base || typeof base !== 'string') return null;
    return base.replace(/\/$/, '');
  },

  uniqueList: function (arr) {
    var out = [];
    for (var i = 0; i < arr.length; i += 1) {
      if (arr[i] && out.indexOf(arr[i]) === -1) out.push(arr[i]);
    }
    return out;
  },

  buildCandidates: function () {
    var host = window.location.hostname;
    var sameOrigin = window.location.origin + '/api';
    var local = 'http://127.0.0.1:3000/api';
    var override = this.normalizeBase(this.getOverrideBase());
    var candidates = [];

    if (override) candidates.push(override);

    if (host === 'localhost' || host === '127.0.0.1') {
      candidates.push(local);
      candidates.push(sameOrigin);
    } else {
      // Cloudflared/public deployments should use same-origin first.
      candidates.push(sameOrigin);
      candidates.push(this.prodUrl);
    }

    return this.uniqueList(candidates);
  },

  getTkn: function () {
    return localStorage.getItem('tkn');
  },

  setTkn: function (t, uid) {
    localStorage.setItem('tkn', t);
    localStorage.setItem('uid', uid || '');
  },

  clr: function () {
    localStorage.clear();
  },

  req: async function (ep, opt) {
    opt = opt || {};
    var hdrs = { 'Content-Type': 'application/json' };
    var tkn = this.getTkn();

    if (!opt.noAuth && tkn) {
      hdrs.Authorization = 'Bearer ' + tkn;
    }

    var cfg = {
      method: opt.m || 'GET',
      headers: hdrs
    };

    if (opt.body) {
      cfg.body = JSON.stringify(opt.body);
    }

    var candidates = this.buildCandidates();
    var lastErr = null;

    for (var i = 0; i < candidates.length; i += 1) {
      var base = candidates[i];
      try {
        var res = await fetch(base + ep, cfg);
        var dat = await res.json();
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
