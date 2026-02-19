// Login functionality
const frm = document.querySelector('form');
const emInp = document.getElementById('idusername');
const pwInp = document.getElementById('idpassword');

function addPasswordToggle(inp) {
  if (!inp || inp.dataset.toggleReady) return;
  inp.dataset.toggleReady = '1';

  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.display = 'block';
  wrap.style.width = '50%';
  inp.parentNode.insertBefore(wrap, inp);
  wrap.appendChild(inp);
  inp.style.width = '100%';
  inp.style.boxSizing = 'border-box';
  inp.style.paddingRight = '38px';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.innerHTML = '<i class="fa-regular fa-eye"></i>';
  btn.setAttribute('aria-label', 'Show password');
  btn.style.position = 'absolute';
  btn.style.right = '8px';
  btn.style.top = '50%';
  btn.style.transform = 'translateY(-50%)';
  btn.style.padding = '0';
  btn.style.width = '24px';
  btn.style.height = '24px';
  btn.style.cursor = 'pointer';
  btn.style.background = 'transparent';
  btn.style.border = 'none';
  btn.style.color = '#b8c2cc';
  btn.addEventListener('click', () => {
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    btn.innerHTML = show
      ? '<i class="fa-regular fa-eye-slash"></i>'
      : '<i class="fa-regular fa-eye"></i>';
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  wrap.appendChild(btn);
}

addPasswordToggle(pwInp);

console.log('Login page loaded');
console.log('Form found:', !!frm);
console.log('Email input found:', !!emInp);
console.log('Password input found:', !!pwInp);

frm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  console.log('Form submitted');

  const em = emInp.value.trim();
  const pw = pwInp.value;

  console.log('Email:', em);
  console.log('Password length:', pw.length);

  if (!em || !pw) {
    alert('Please fill in all fields');
    return;
  }

  const subBtn = frm.querySelector('input[type="submit"]');
  if (!subBtn) {
    console.error('Submit button not found!');
    return;
  }

  subBtn.disabled = true;
  subBtn.value = 'Logging in...';

  try {
    console.log('Sending login request...');
    
    const res = await api.req('/auth/login', {
      m: 'POST',
      noAuth: true,
      body: { em, pw }
    });

    console.log('Login response:', res);

    if (res && res.ok) {
      console.log('Login successful! Token:', res.tkn?.substring(0, 20) + '...');
      api.setTkn(res.tkn, res.uid);
      const meRes = await api.req('/usr/profile');
      if (meRes.ok && api.isTeamAdminUser(meRes.data)) {
        localStorage.removeItem('viewTid');
        localStorage.removeItem('viewUid');
        window.location.href = 'allTeams.html';
        return;
      }
      console.log('Redirecting to homepage...');
      window.location.href = 'homepage.html';
    } else {
      console.error('Login failed:', res?.msg);
      alert(res?.msg || 'Login failed. Please check your credentials.');
      subBtn.disabled = false;
      subBtn.value = 'Log In';
    }
  } catch (e) {
    console.error('Login error:', e);
    alert('Cannot connect to server. Make sure backend is running on port 3000.\n\nError: ' + e.message);
    subBtn.disabled = false;
    subBtn.value = 'Log In';
  }
});

// Test API connection on load
window.addEventListener('DOMContentLoaded', () => {
  console.log('Testing API connection...');
  fetch(api.url + '/health')
    .then(res => {
      console.log('API connection test:', res.ok ? 'SUCCESS' : 'FAILED');
    })
    .catch(e => {
      console.error('API connection test FAILED:', e.message);
      alert('Warning: Cannot connect to backend server!\n\nMake sure you ran:\nnpm start');
    });
});
