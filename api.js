const api = {
  url: 'http://localhost:3000',
  
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
      headers: hdrs,
      ...opt
    };
    
    if (opt.body) {
      cfg.body = JSON.stringify(opt.body);
    }
    
    const res = await fetch(this.url + ep, cfg);
    const dat = await res.json();
    
    if (!dat.ok && res.status === 401) {
      this.clr();
      window.location.href = 'login.html';
    }
    
    return dat;
  }
};
