const sidepanel = document.getElementById('side-panel');
const overlay = document.getElementById('overlay');

let currUsr = null;
let isAdmin = false;
let currTeam = null;

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
  if (!isAdmin) return;
  document.querySelectorAll('.side-panel .links').forEach((link) => {
    const href = link.getAttribute('href');
    const allowed = href === 'allTeams.html' || href === 'editProfile.html';
    if (!allowed && !link.classList.contains('logout-link')) {
      link.style.display = 'none';
    }
  });
}

function openProfile(uid) {
  if (isAdmin) return;
  localStorage.setItem('viewUid', String(uid));
  window.location.href = 'profile.html';
}

async function deleteTeam() {
  if (!currTeam) return;
  const ok = confirm(`Delete team "${currTeam.tn}"? This cannot be undone.`);
  if (!ok) return;

  const res = await api.req(`/team/${currTeam.id}`, { m: 'DELETE' });
  if (!res.ok) {
    alert(res.msg || 'Failed to delete team');
    return;
  }

  alert('Team deleted');
  currTeam = null;
  localStorage.removeItem('viewTid');
  await loadTeam();
}

async function removeMember(memberId, memberName) {
  if (!currTeam) return;
  const ok = confirm(`Remove ${memberName} from this team?`);
  if (!ok) return;

  const res = await api.req(`/team/${currTeam.id}/member/${memberId}`, { m: 'DELETE' });
  if (!res.ok) {
    alert(res.msg || 'Failed to remove member');
    return;
  }

  currTeam = res.data;
  renderTeam(currTeam);
}

function renderAdminTeamActions(team) {
  const main = document.querySelector('.main-layout');
  if (!main) return;

  const existing = document.getElementById('admin-team-actions');
  if (existing) existing.remove();
  if (!isAdmin || !team) return;

  const wrap = document.createElement('div');
  wrap.id = 'admin-team-actions';
  wrap.style.marginTop = '8px';
  wrap.style.marginBottom = '8px';
  wrap.style.display = 'flex';
  wrap.style.gap = '10px';

  const delBtn = document.createElement('button');
  delBtn.textContent = 'Delete Team';
  delBtn.style.cursor = 'pointer';
  delBtn.style.padding = '8px 12px';
  delBtn.style.borderRadius = '8px';
  delBtn.style.border = '1px solid #fff';
  delBtn.style.background = '#9b3c3c';
  delBtn.style.color = '#fff';
  delBtn.onclick = deleteTeam;

  wrap.appendChild(delBtn);
  main.insertBefore(wrap, main.children[1] || null);
}

function renderTeam(team) {
  const title = document.querySelector('.title');
  if (title) title.textContent = (team.tn || 'TEAM').toUpperCase();

  const leaderImg = document.querySelector('.leaderProfile');
  const leaderName = document.querySelector('.leaderName');
  if (leaderImg) leaderImg.src = team.leader?.pp ? api.getAssetUrl(team.leader.pp) : 'elements/leaderImage.png';
  if (leaderName) leaderName.textContent = team.leader ? userName(team.leader) : 'Unknown';

  const leaderBlock = document.querySelector('.leaderBlock');
  leaderBlock?.addEventListener('click', () => {
    if (team.leader?.id) openProfile(team.leader.id);
  });

  const projectTitle = document.querySelector('.projectTitle strong');
  const projectDescription = document.querySelector('.projectDescription');
  if (projectTitle) projectTitle.textContent = team.meta?.pn || 'TBD';
  if (projectDescription) projectDescription.textContent = team.meta?.pd || 'No project description yet.';

  const membersWrap = document.querySelector('.first-row');
  if (!membersWrap) return;
  membersWrap.innerHTML = '';

  (team.members || []).forEach((m) => {
    const blk = document.createElement('div');
    blk.className = 'memberBlock';
    blk.style.cursor = isAdmin ? 'default' : 'pointer';
    blk.addEventListener('click', () => openProfile(m.id));

    const img = document.createElement('img');
    img.src = m.pp ? api.getAssetUrl(m.pp) : 'elements/memberImage.png';
    img.alt = 'memberProfile';
    img.className = 'memberProfile';

    const nm = document.createElement('p');
    nm.className = 'memberName';
    nm.textContent = userName(m);

    blk.appendChild(img);
    blk.appendChild(nm);

    if (isAdmin && Number(m.id) !== Number(team.lid)) {
      const rm = document.createElement('button');
      rm.textContent = 'Remove';
      rm.style.marginTop = '6px';
      rm.style.padding = '4px 8px';
      rm.style.borderRadius = '8px';
      rm.style.border = '1px solid #fff';
      rm.style.background = '#9b3c3c';
      rm.style.color = '#fff';
      rm.style.cursor = 'pointer';
      rm.onclick = (e) => {
        e.stopPropagation();
        removeMember(m.id, userName(m));
      };
      blk.appendChild(rm);
    }

    membersWrap.appendChild(blk);
  });

  renderAdminTeamActions(team);
}

function renderNoTeam() {
  const title = document.querySelector('.title');
  if (title) title.textContent = 'NO TEAM FOUND';
  const projectTitle = document.querySelector('.projectTitle strong');
  const projectDescription = document.querySelector('.projectDescription');
  if (projectTitle) projectTitle.textContent = 'N/A';
  if (projectDescription) projectDescription.textContent = isAdmin
    ? 'No teams exist yet.'
    : 'Select a team from All Teams.';
  const membersWrap = document.querySelector('.first-row');
  if (membersWrap) membersWrap.innerHTML = '';
  renderAdminTeamActions(null);
}

async function loadTeam() {
  const storedTid = localStorage.getItem('viewTid');

  if (storedTid) {
    const teamRes = await api.req(`/team/${storedTid}`);
    if (teamRes.ok && teamRes.data) {
      currTeam = teamRes.data;
      renderTeam(currTeam);
      return;
    }
  }

  if (isAdmin) {
    const allRes = await api.req('/team/all');
    if (allRes.ok && allRes.data && allRes.data.length > 0) {
      const firstTeamId = allRes.data[0].id;
      localStorage.setItem('viewTid', String(firstTeamId));
      const firstTeamRes = await api.req(`/team/${firstTeamId}`);
      if (firstTeamRes.ok && firstTeamRes.data) {
        currTeam = firstTeamRes.data;
        renderTeam(currTeam);
        return;
      }
    }
    renderNoTeam();
    return;
  }

  window.location.href = 'allTeams.html';
}

async function init() {
  if (!api.getTkn()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const meRes = await api.req('/usr/profile');
    if (!meRes.ok) {
      alert(meRes.msg || 'Unable to load profile');
      return;
    }
    currUsr = meRes.data;
    isAdmin = api.isTeamAdminUser(currUsr);
    setSidebarUser(currUsr);
    enforceAdminNavOnly();

    await loadTeam();
  } catch (e) {
    console.error(e);
    alert('Error loading team page');
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
