// Signup functionality
const imgUpl = document.getElementById('imageUploader');
const imgInp = document.getElementById('profilePic');
const subBtn = document.getElementById('signupButton') || document.querySelector('.signupButton');
const reqSelects = Array.from(document.querySelectorAll('.row4 select'));
let imgFile = null;

function addPasswordToggle(inp) {
  if (!inp || inp.dataset.toggleReady) return;
  inp.dataset.toggleReady = '1';

  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  wrap.style.display = 'inline-block';
  wrap.style.width = '40vh';
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

addPasswordToggle(document.getElementById('idPassword'));
addPasswordToggle(document.getElementById('idConfirm'));

function userName(u) {
  return `${u.pn || u.fn} ${u.ln}`;
}

function getSelectedReqIds() {
  const ids = reqSelects
    .map((s) => Number(s.value))
    .filter((v) => Number.isInteger(v) && v > 0);
  return [...new Set(ids)].slice(0, 3);
}

function populateRequestedDropdowns(users) {
  if (!reqSelects.length) return;

  const selected = getSelectedReqIds();
  reqSelects.forEach((sel) => {
    sel.innerHTML = '<option value="">--Select a person--</option>';
    users.forEach((u) => {
      const opt = document.createElement('option');
      opt.value = String(u.id);
      opt.textContent = `${userName(u)} (${u.cl || ''})`;
      sel.appendChild(opt);
    });
  });

  reqSelects.forEach((sel, idx) => {
    if (selected[idx]) sel.value = String(selected[idx]);
  });
}

async function loadRequestedMemberOptions() {
  const res = await api.req('/usr/options', { noAuth: true });
  if (res.ok && Array.isArray(res.data)) {
    populateRequestedDropdowns(res.data);
  }
}

imgUpl?.addEventListener('click', () => imgInp.click());

imgInp?.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) {
    imgFile = f;
    const rdr = new FileReader();
    rdr.onload = (ev) => {
      imgUpl.innerHTML = `<img src="${ev.target.result}" alt="Profile">`;
    };
    rdr.readAsDataURL(f);
  }
});

// Char counters
['idTechnicalSkills', 'idSoftSkills'].forEach(id => {
  const el = document.getElementById(id);
  const cnt = document.getElementById(id === 'idTechnicalSkills' ? 'techCharCount' : 'softCharCount');
  el?.addEventListener('input', () => {
    cnt.textContent = `${el.value.length} / 200`;
  });
});

// Submit
subBtn?.addEventListener('click', async () => {
  const fn = document.getElementById('idFirstName').value.trim();
  const ln = document.getElementById('idLastName').value.trim();
  const pn = document.getElementById('idPreferredName').value.trim();
  const em = document.getElementById('idEmail').value.trim();
  const pw = document.getElementById('idPassword').value;
  const pw2 = document.getElementById('idConfirm').value;
  const ph = document.getElementById('idNumber').value.trim();
  const cl = document.getElementById('classDropdown').value;
  const ts = document.getElementById('idTechnicalSkills').value.trim();
  const ss = document.getElementById('idSoftSkills').value.trim();

  if (!fn || !ln || !em || !pw || !cl) {
    alert('Fill required fields');
    return;
  }

  if (pw !== pw2) {
    alert('Passwords do not match');
    return;
  }

  if (pw.length < 6) {
    alert('Password must be 6+ characters');
    return;
  }

  subBtn.disabled = true;
  subBtn.textContent = 'Creating...';

  try {
    const res = await api.req('/auth/register', {
      m: 'POST',
      noAuth: true,
      body: { fn, ln, pn, em, pw, ph, cl, ts, ss }
    });

    if (res.ok) {
      api.setTkn(res.tkn, res.uid);

      if (imgFile) {
        const fd = new FormData();
        fd.append('pic', imgFile);
        await fetch(api.url + '/usr/profile/pic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${res.tkn}` },
          body: fd
        });
      }

      const reqIds = getSelectedReqIds();
      if (reqIds.length) {
        await api.req('/usr/profile/requests', {
          m: 'PUT',
          body: { memberIds: reqIds }
        });
      }

      window.location.href = 'homepage.html';
    } else {
      alert(res.msg || 'Registration failed');
      subBtn.disabled = false;
      subBtn.textContent = 'Submit';
    }
  } catch (e) {
    console.error('Signup error:', e);
    if (e.message && e.message.includes('fetch')) {
      alert('Cannot connect to server. Make sure backend is running on port 3000.');
    } else {
      alert('Registration error. Check console for details.');
    }
    subBtn.disabled = false;
    subBtn.textContent = 'Submit';
  }
});

loadRequestedMemberOptions();
