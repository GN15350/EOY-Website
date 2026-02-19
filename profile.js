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

function renderRequestedMembers(reqMembers) {
  const row = document.querySelector('.memberRow');
  if (!row) return;

  row.innerHTML = '';
  if (!Array.isArray(reqMembers) || reqMembers.length === 0) {
    const p = document.createElement('p');
    p.className = 'requestedMember';
    p.textContent = 'No requested members yet';
    row.appendChild(p);
    return;
  }

  reqMembers.slice(0, 3).forEach((m) => {
    const p = document.createElement('p');
    p.className = 'requestedMember';
    p.textContent = userName(m);
    row.appendChild(p);
  });
}

function renderProfile(u, currUsr) {
  document.title = `${userName(u)} - Profile`;

  const profImg = document.querySelector('.userProfile');
  if (profImg) profImg.src = u.pp ? api.getAssetUrl(u.pp) : 'elements/userProfile.png';

  const nmCard = document.querySelector('.nameCard');
  if (nmCard) nmCard.textContent = `${(u.pn || u.fn).toUpperCase()} ${u.ln.toUpperCase()}`;

  const emlElem = document.querySelector('.email');
  if (emlElem) emlElem.textContent = u.em;

  const phnElem = document.querySelector('.phoneNumber');
  if (phnElem) phnElem.textContent = u.ph || '###-###-####';

  const techSkills = document.querySelector('.technicalSkills');
  if (techSkills) techSkills.textContent = u.ts || 'No technical skills listed';

  const sftSkills = document.querySelector('.softSkills');
  if (sftSkills) sftSkills.textContent = u.ss || 'No soft skills listed';

  const ttl = document.querySelector('.title');
  if (ttl) ttl.textContent = u.cl;

  const reqBtn = document.querySelector('.requestButton');
  if (!reqBtn) return;

  if (currUsr.cl === 'CS1' && currUsr.id !== u.id) {
    reqBtn.style.display = 'block';
    reqBtn.onclick = () => sendReq(u, reqBtn);
  } else {
    reqBtn.style.display = 'none';
  }
}

async function sendReq(usr, btn) {
  try {
    const res = await api.req('/usr/request', {
      m: 'POST',
      body: {
        toId: usr.id,
        toEm: usr.em,
        toNm: userName(usr)
      }
    });

    if (res.ok) {
      alert('Request sent!');
      btn.disabled = true;
      btn.textContent = 'Request Sent';
    } else {
      alert(res.msg || 'Failed to send request');
    }
  } catch (e) {
    console.error(e);
    alert('Error sending request');
  }
}

async function init() {
  if (!api.getTkn()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const meRes = await api.req('/usr/profile');
    if (!meRes.ok) return;
    const currUsr = meRes.data;
    if (api.isTeamAdminUser(currUsr)) {
      window.location.href = 'allTeams.html';
      return;
    }
    setSidebarUser(currUsr);

    const rawViewId = localStorage.getItem('viewUid');
    const parsedViewId = rawViewId ? Number(rawViewId) : NaN;
    const viewId = Number.isFinite(parsedViewId) && parsedViewId > 0 ? parsedViewId : currUsr.id;
    const targetRes = viewId === currUsr.id ? meRes : await api.req(`/usr/${viewId}`);
    localStorage.removeItem('viewUid');

    if (targetRes.ok) {
      renderProfile(targetRes.data, currUsr);
      const reqRes = await api.req(`/usr/${targetRes.data.id}/requests`);
      renderRequestedMembers(reqRes.ok ? reqRes.data : []);
    } else {
      renderProfile(currUsr, currUsr);
      const reqRes = await api.req(`/usr/${currUsr.id}/requests`);
      renderRequestedMembers(reqRes.ok ? reqRes.data : []);
    }
  } catch (e) {
    console.error(e);
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
