// API Configuration - Cloudflare Tunnel
const api = {
  url: 'https://eoyapi.monty.my/api',
  
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
    
    console.log('API Request:', cfg.method, this.url + ep);
    console.log('Request config:', cfg);
    
    try {
      const res = await fetch(this.url + ep, cfg);
      console.log('Response status:', res.status, res.statusText);
      
      const dat = await res.json();
      console.log('Response data:', dat);
      
      if (!dat.ok && res.status === 401) {
        this.clr();
        window.location.href = 'login.html';
      }
      
      return dat;
    } catch (err) {
      console.error('Fetch error:', err);
      console.error('URL was:', this.url + ep);
      throw err;
    }
  }
};