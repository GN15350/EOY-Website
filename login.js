// Login functionality
const frm = document.querySelector('form');
const emInp = document.getElementById('idusername');
const pwInp = document.getElementById('idpassword');

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
  fetch('https://eoyapi.monty.my/api/auth/login', {
    method: 'OPTIONS'
  })
  .then(res => {
    console.log('API connection test:', res.ok ? 'SUCCESS' : 'FAILED');
  })
  .catch(e => {
    console.error('API connection test FAILED:', e.message);
    alert('Warning: Cannot connect to backend server!\n\nMake sure you ran:\nnpm start');
  });
});
