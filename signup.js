
const imgUpl = document.getElementById('imageUploader');
const imgInp = document.getElementById('profilePic');
const subBtn = document.getElementById('submitButton') || document.querySelector('.submitButton');
let imgFile = null;

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


['idTechnicalSkills', 'idSoftSkills'].forEach(id => {
  const el = document.getElementById(id);
  const cnt = document.getElementById(id === 'idTechnicalSkills' ? 'techCharCount' : 'softCharCount');
  el?.addEventListener('input', () => {
    cnt.textContent = `${el.value.length} / 200`;
  });
});


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
        await fetch('https://eoyapi.monty.my/api/usr/profile/pic', {
          method: 'POST',
          headers: { Authorization: `Bearer ${res.tkn}` },
          body: fd
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
