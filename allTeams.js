const sidepanel = document.getElementById('side-panel');
const overlay = document.getElementById('overlay');

let currUsr = null;
let myTeamId = null;
let isTeamAdmin = false;
let deleteMode = false;

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

function enforceAdminNavOnly() {
  if (!isTeamAdmin) return;
  document.querySelectorAll('.side-panel .links').forEach((link) => {
    const href = link.getAttribute('href');
    const allowed = href === 'allTeams.html' || href === 'editProfile.html';
    if (!allowed && !link.classList.contains('logout-link')) {
      link.style.display = 'none';
    }
  });
}

function upsertDeleteModeButton() {
  let btn = document.getElementById('deleteModeButton');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'deleteModeButton';
    btn.style.position = 'fixed';
    btn.style.right = '24px';
    btn.style.bottom = '24px';
    btn.style.padding = '8px 12px';
    btn.style.borderRadius = '10px';
    btn.style.border = '1px solid rgba(255,255,255,0.8)';
    btn.style.color = 'white';
    btn.style.background = '#2C656B';
    btn.style.fontFamily = 'Montserrat';
    btn.style.cursor = 'pointer';
    btn.style.zIndex = '3';
    btn.onclick = () => {
      deleteMode = !deleteMode;
      upsertDeleteModeButton();
    };
    document.body.appendChild(btn);
  }

  btn.style.display = isTeamAdmin ? 'inline-block' : 'none';
  if (!isTeamAdmin) return;

  btn.textContent = deleteMode ? 'Delete Mode: ON' : 'Delete Mode: OFF';
  btn.style.background = deleteMode ? '#9b3c3c' : '#2C656B';
}

function createTeamBlock(team) {
  const blk = document.createElement('div');
  blk.className = 'teamBlock';

  const ttl = document.createElement('p');
  ttl.className = 'blockTitle';
  ttl.textContent = team.tn;

  const lead = document.createElement('p');
  lead.className = 'teamLeader';
  lead.textContent = `Leader: ${team.leader ? `${team.leader.pn || team.leader.fn} ${team.leader.ln}` : 'Unknown'}`;

  blk.appendChild(ttl);
  blk.appendChild(lead);

  blk.addEventListener('click', async () => {
    if (isTeamAdmin && deleteMode) {
      const delRes = await api.req(`/team/${team.id}`, { m: 'DELETE' });
      if (!delRes.ok) {
        alert(delRes.msg || 'Failed to delete team');
        return;
      }
      await loadData();
      return;
    }

    localStorage.setItem('viewTid', String(team.id));
    window.location.href = 'teamPage.html';
  });

  return blk;
}

function createCreateTeamBlock() {
  const blk = document.createElement('div');
  blk.className = 'teamBlock';

  const ttl = document.createElement('p');
  ttl.className = 'blockTitle';
  ttl.textContent = 'Create Team';

  const desc = document.createElement('p');
  desc.className = 'teamLeader';
  desc.textContent = 'Click to create';

  blk.appendChild(ttl);
  blk.appendChild(desc);

  blk.addEventListener('click', async () => {
    const tn = prompt('Team name:');
    if (!tn || !tn.trim()) return;

    const pn = prompt('Project name (optional):') || '';
    const pd = prompt('Project description (optional):') || '';
    const gl = prompt('Current status (optional):') || '';

    const res = await api.req('/team', {
      m: 'POST',
      body: { tn: tn.trim(), pn: pn.trim(), pd: pd.trim(), gl: gl.trim() }
    });

    if (!res.ok) {
      alert(res.msg || 'Failed to create team');
      return;
    }

    alert('Team created');
    localStorage.setItem('viewTid', String(res.data.id));
    window.location.href = 'teamPage.html';
  });

  return blk;
}

async function loadData() {
  if (!api.getTkn()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const meRes = await api.req('/usr/profile');
    if (!meRes.ok) return;
    currUsr = meRes.data;
    isTeamAdmin = api.isTeamAdminUser(currUsr);
    setSidebarUser(currUsr);
    enforceAdminNavOnly();
    upsertDeleteModeButton();

    const myTeamRes = await api.req('/team/my');
    if (myTeamRes.ok && myTeamRes.data) myTeamId = myTeamRes.data.id;

    const teamRes = await api.req('/team/all');
    const grid = document.querySelector('.grid');
    if (!grid || !teamRes.ok) return;

    grid.innerHTML = '';
    if (!myTeamId && !isTeamAdmin) {
      grid.appendChild(createCreateTeamBlock());
    }

    if (!teamRes.data || teamRes.data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'teamBlock';
      const subtitle = isTeamAdmin ? 'sorry about that' : 'Create the first one';
      empty.innerHTML = `<p class="blockTitle">No Teams Yet</p><p class="teamLeader">${subtitle}</p>`;
      grid.appendChild(empty);
      return;
    }

    teamRes.data.forEach((team) => {
      grid.appendChild(createTeamBlock(team));
    });
  } catch (e) {
    console.error(e);
    alert('Error loading teams');
  }
}

document.querySelector('.logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Logout?')) {
    api.clr();
    window.location.href = 'login.html';
  }
});

loadData();
