// Edit Profile with auto-fill
const sidepanel = document.getElementById("side-panel");
const overlay = document.getElementById("overlay");

function openMenu() {
  sidepanel.classList.add("open");
  overlay.classList.add("show");
}

function closeMenu() {
  sidepanel.classList.remove("open");
  overlay.classList.remove("show");
}

overlay.addEventListener("click", closeMenu);

const imgUpl = document.getElementById('imageUploader');
const imgInp = document.getElementById('profilePic');
let newImg = null;

imgUpl?.addEventListener('click', () => imgInp.click());

imgInp?.addEventListener('change', (e) => {
  const f = e.target.files[0];
  if (f) {
    newImg = f;
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

// Check auth
if (!api.getTkn()) {
  window.location.href = 'login.html';
} else {
  loadData();
}

async function loadData() {
  try {
    const res = await api.req('/usr/profile');
    
    if (res.ok) {
      const u = res.data;
      
      // Auto-fill form
      document.getElementById('idFirstName').value = u.fn || '';
      document.getElementById('idLastName').value = u.ln || '';
      document.getElementById('idPreferredName').value = u.pn || '';
      document.getElementById('idEmail').value = u.em || '';
      document.getElementById('idNumber').value = u.ph || '';
      document.getElementById('classDropdown').value = u.cl || '';
      document.getElementById('idTechnicalSkills').value = u.ts || '';
      document.getElementById('idSoftSkills').value = u.ss || '';

      // Update char counts
      document.getElementById('techCharCount').textContent = `${(u.ts || '').length} / 200`;
      document.getElementById('softCharCount').textContent = `${(u.ss || '').length} / 200`;

      // Show profile pic
      if (u.pp) {
        imgUpl.innerHTML = `<img src="https://eoyapi.monty.my${u.pp}" alt="Profile">`;
      }

      // Update sidebar
      const nm = document.querySelector('.side-panel .name');
      if (nm) nm.textContent = `${u.pn || u.fn} ${u.ln}`;
    }
  } catch (e) {
    console.error(e);
  }
}

// Save button
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
      await fetch('https://eoyapi.monty.my/api/usr/profile/pic', {
        method: 'POST',
        headers: { Authorization: `Bearer ${api.getTkn()}` },
        body: fd
      });
    }

    const res = await api.req('/usr/profile', {
      m: 'PUT',
      body: { fn, ln, pn, ph, cl, ts, ss }
    });

    if (res.ok) {
      alert('Profile updated!');
      await loadData();
    } else {
      alert(res.msg || 'Update failed');
    }

    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  } catch (e) {
    console.error(e);
    alert('Error updating');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
  }
});

// Logout
document.querySelector('.logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Logout?')) {
    api.clr();
    window.location.href = 'login.html';
  }
});
