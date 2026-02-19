const sidepanel = document.getElementById('side-panel');
const overlay = document.getElementById('overlay');
const imgUpl = document.getElementById('imageUploader');
const imgInp = document.getElementById('profilePic');
const reqSelects = Array.from(document.querySelectorAll('.row4 select'));

let newImg = null;

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

function openMenu() {
  sidepanel?.classList.add('open');
  overlay?.classList.add('show');
}

function closeMenu() {
  sidepanel?.classList.remove('open');
  overlay?.classList.remove('show');
}

overlay?.addEventListener('click', closeMenu);

imgUpl?.addEventListener('click', () => imgInp?.click());

imgInp?.addEventListener('change', (e) => {
  const f = e.target.files?.[0];
  if (!f) return;

  newImg = f;
  const rdr = new FileReader();
  rdr.onload = (ev) => {
    imgUpl.innerHTML = `<img src="${ev.target.result}" alt="Profile">`;
  };
  rdr.readAsDataURL(f);
});

['idTechnicalSkills', 'idSoftSkills'].forEach((id) => {
  const el = document.getElementById(id);
  const cnt = document.getElementById(id === 'idTechnicalSkills' ? 'techCharCount' : 'softCharCount');
  el?.addEventListener('input', () => {
    if (cnt) cnt.textContent = `${el.value.length} / 200`;
  });
});

function userName(u) {
  return `${u.pn || u.fn} ${u.ln}`;
}

function setSidebarUser(u) {
  const nm = document.querySelector('.side-panel .name');
  if (nm) nm.textContent = userName(u);
  const img = document.querySelector('.side-panel .profile-image');
  if (img) img.src = u.pp ? api.getAssetUrl(u.pp) : 'elements/pfpimage.png';
}

function getSelectedReqIds() {
  const ids = reqSelects
    .map((s) => Number(s.value))
    .filter((v) => Number.isInteger(v) && v > 0);
  return [...new Set(ids)].slice(0, 3);
}

function populateRequestedDropdowns(users, selectedIds = []) {
  if (!reqSelects.length) return;

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
    if (selectedIds[idx]) sel.value = String(selectedIds[idx]);
  });
}

function enforceAdminNavOnly(user) {
  if (!api.isTeamAdminUser(user)) return;
  document.querySelectorAll('.side-panel .links').forEach((link) => {
    const href = link.getAttribute('href');
    const allowed = href === 'allTeams.html' || href === 'editProfile.html';
    if (!allowed && !link.classList.contains('logout-link')) {
      link.style.display = 'none';
    }
  });
}

async function loadData() {
  try {
    const res = await api.req('/usr/profile');
    if (!res.ok) return null;
    const u = res.data;

    document.getElementById('idFirstName').value = u.fn || '';
    document.getElementById('idLastName').value = u.ln || '';
    document.getElementById('idPreferredName').value = u.pn || '';
    document.getElementById('idEmail').value = u.em || '';
    document.getElementById('idNumber').value = u.ph || '';
    document.getElementById('classDropdown').value = u.cl || '';
    document.getElementById('idTechnicalSkills').value = u.ts || '';
    document.getElementById('idSoftSkills').value = u.ss || '';

    document.getElementById('techCharCount').textContent = `${(u.ts || '').length} / 200`;
    document.getElementById('softCharCount').textContent = `${(u.ss || '').length} / 200`;

    if (u.pp && imgUpl) {
      imgUpl.innerHTML = `<img src="${api.getAssetUrl(u.pp)}" alt="Profile">`;
    }

    setSidebarUser(u);
    enforceAdminNavOnly(u);

    const [allRes, reqRes] = await Promise.all([
      api.req('/usr/all'),
      api.req('/usr/profile/requests')
    ]);
    if (allRes.ok && Array.isArray(allRes.data)) {
      const selectedIds = reqRes.ok && Array.isArray(reqRes.data)
        ? reqRes.data.map((m) => m.id).slice(0, 3)
        : [];
      populateRequestedDropdowns(allRes.data, selectedIds);
    }

    return u;
  } catch (e) {
    console.error(e);
    return null;
  }
}

const saveBtn = document.querySelector('.saveButton');
saveBtn?.addEventListener('click', async () => {
  const fn = document.getElementById('idFirstName').value.trim();
  const ln = document.getElementById('idLastName').value.trim();
  const pn = document.getElementById('idPreferredName').value.trim();
  const ph = document.getElementById('idNumber').value.trim();
  const cl = document.getElementById('classDropdown').value;
  const ts = document.getElementById('idTechnicalSkills').value.trim();
  const ss = document.getElementById('idSoftSkills').value.trim();

  if (!fn || !ln || !cl) {
    alert('Fill required fields');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  try {
    if (newImg) {
      const fd = new FormData();
      fd.append('pic', newImg);
      const uplRes = await fetch(`${api.url}/usr/profile/pic`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.getTkn()}` },
        body: fd
      });
      if (!uplRes.ok) {
        alert('Failed to upload profile image');
      }
    }

    const res = await api.req('/usr/profile', {
      m: 'PUT',
      body: { fn, ln, pn, ph, cl, ts, ss }
    });

    if (res.ok) {
      await api.req('/usr/profile/requests', {
        m: 'PUT',
        body: { memberIds: getSelectedReqIds() }
      });
      alert('Profile updated!');
      await loadData();
    } else {
      alert(res.msg || 'Update failed');
    }
  } catch (e) {
    console.error(e);
    alert('Error updating');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

document.querySelector('.logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Logout?')) {
    api.clr();
    window.location.href = 'login.html';
  }
});

if (!api.getTkn()) {
  window.location.href = 'login.html';
} else {
  loadData();
}
