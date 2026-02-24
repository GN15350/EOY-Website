// API Configuration - Cloudflare Tunnel (prod) / local dev
const TEAM_ADMIN_EMAIL = 'mcbrayers@friscoisd.org';

const api = {
  url: (() => {
    try {
      const h = window.location.hostname;
      if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '::' || h === '') {
        return 'http://127.0.0.1:3000/api';
      }
    } catch (_) {}
    return 'https://api.frisco-cs.com/api';
  })(),

  getAssetUrl(assetPath) {
    if (!assetPath) return '';
    if (/^https?:\/\//i.test(assetPath)) return assetPath;

    try {
      const u = new URL(this.url);
      return `${u.origin}${assetPath}`;
    } catch (_) {
      return assetPath;
    }
  },

  isTeamAdminUser(user) {
    return !!user && typeof user.em === 'string' && user.em.toLowerCase() === TEAM_ADMIN_EMAIL;
  },
  
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
    
    if (tkn && !opt.noAuth) {
      hdrs.Authorization = `Bearer ${tkn}`;
    }
    
    const cfg = {
      method: opt.m || 'GET',
      headers: hdrs
    };
    
    if (opt.body) {
      cfg.body = JSON.stringify(opt.body);
    }
    
    try {
      const res = await fetch(this.url + ep, cfg);
      const txt = await res.text();
      let dat = null;

      try {
        dat = txt ? JSON.parse(txt) : null;
      } catch (_) {
        dat = { ok: res.ok, msg: txt || res.statusText || 'Unexpected response' };
      }

      if (res.status === 401) {
        this.clr();
        window.location.href = 'login.html';
      }

      if (!dat || typeof dat !== 'object') {
        return { ok: res.ok, msg: res.ok ? 'OK' : 'Request failed' };
      }

      if (typeof dat.ok !== 'boolean') {
        dat.ok = res.ok;
      }

      return dat;
    } catch (err) {
      return { ok: false, msg: `Network error contacting ${this.url}${ep}: ${err.message}` };
    }
  }
};
