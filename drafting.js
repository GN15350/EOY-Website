const sidepanel = document.getElementById('side-panel');
const overlay = document.getElementById('overlay');

function openMenu() {
  sidepanel?.classList.add('open');
  overlay?.classList.add('show');
}

function closeMenu() {
  sidepanel?.classList.remove('open');
  overlay?.classList.remove('show');
}

overlay?.addEventListener('click', closeMenu);

function userName(u) {
  return `${u.pn || u.fn} ${u.ln}`;
}

function setSidebarUser(u) {
  const nm = document.querySelector('.side-panel .name');
  if (nm) nm.textContent = userName(u);
  const img = document.querySelector('.side-panel .profile-image');
  if (img) img.src = u.pp ? api.getAssetUrl(u.pp) : 'elements/pfpimage.png';
}

function renderUsrs(usrs) {
  const grd = document.querySelector('.grid');
  if (!grd) return;

  const filtered = (usrs || []).filter((u) => {
    const em = String(u.em || '').toLowerCase();
    const cl = String(u.cl || '').toUpperCase();
    return em !== 'mcbrayers@friscoisd.org' && cl !== 'TEACHER';
  });

  grd.innerHTML = '';
  if (!filtered.length) {
    grd.innerHTML = '<p style="color: white; font-family: Montserrat; grid-column: 1/-1; text-align: center;">No other users found</p>';
    return;
  }

  filtered.forEach((u) => {
    const blk = document.createElement('div');
    blk.className = 'profileBlock';

    const img = document.createElement('img');
    img.className = 'profileImage';
    img.alt = 'profileImage';
    img.src = u.pp ? api.getAssetUrl(u.pp) : 'elements/profileImage.png';

    const nm = document.createElement('p');
    nm.className = 'name';
    nm.textContent = userName(u);

    const cls = document.createElement('p');
    cls.className = 'class';
    cls.textContent = u.cl;

    blk.appendChild(img);
    blk.appendChild(nm);
    blk.appendChild(cls);
    blk.addEventListener('click', () => {
      localStorage.setItem('viewUid', String(u.id));
      window.location.href = 'profile.html';
    });

    grd.appendChild(blk);
  });
}

async function init() {
  if (!api.getTkn()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const meRes = await api.req('/usr/profile');
    if (!meRes.ok) {
      alert(meRes.msg || 'Unable to load your profile');
      return;
    }
    const me = meRes.data;
    if (api.isTeamAdminUser(me)) {
      window.location.href = 'allTeams.html';
      return;
    }
    setSidebarUser(me);

    if (me.cl !== 'CS1') {
      const grd = document.querySelector('.grid');
      if (grd) {
        grd.innerHTML = '<p style="color: white; font-family: Montserrat; grid-column: 1/-1; text-align: center;">Drafting is available to CS1 students only.</p>';
      }
      return;
    }

    const res = await api.req('/usr/all');
    if (!res.ok) {
      alert(res.msg || 'Unable to load users');
      return;
    }
    renderUsrs(res.data);
  } catch (e) {
    console.error(e);
    alert(`Error loading users: ${e.message}`);
  }
}

document.querySelector('.logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Logout?')) {
    api.clr();
    window.location.href = 'login.html';
  }
});

init();
