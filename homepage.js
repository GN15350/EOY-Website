const sidepanel = document.getElementById('side-panel');
const overlay = document.getElementById('overlay');
const historyOverlay = document.getElementById('history-overlay');
const sections = Array.from(document.querySelectorAll('.section1, .section2'));
const arrowLeft = document.querySelector('.arrow-left');
const arrowRight = document.querySelector('.arrow-right');

let activeSection = 0;
let currUsr = null;
let currTeam = null;
let checklist = [];
let statusHistory = [];
let historyPopupOpen = false;
const checklistRemoveTimers = new WeakMap();

function syncOverlayState() {
  const menuOpen = !!sidepanel?.classList.contains('open');
  if (menuOpen) {
    overlay?.classList.add('show');
  } else {
    overlay?.classList.remove('show');
  }
}

function openMenu() {
  sidepanel?.classList.add('open');
  syncOverlayState();
}

function closeMenu() {
  sidepanel?.classList.remove('open');
  syncOverlayState();
}

function closeHistoryPopup() {
  const popup = document.querySelector('.history-popup');
  if (popup) popup.classList.remove('show');
  historyOverlay?.classList.remove('show');
  historyPopupOpen = false;
}

overlay?.addEventListener('click', closeMenu);
historyOverlay?.addEventListener('click', closeHistoryPopup);

document.querySelector('.side-panel .closeButton')?.addEventListener('click', () => {
  closeHistoryPopup();
});

function updateSectionNav() {
  sections.forEach((section, index) => {
    section.classList.toggle('is-active', index === activeSection);
  });

  arrowLeft?.classList.toggle('arrow-disabled', activeSection === 0);
  arrowRight?.classList.toggle('arrow-disabled', activeSection === sections.length - 1);
}

arrowLeft?.addEventListener('click', () => {
  if (activeSection > 0) {
    activeSection -= 1;
    updateSectionNav();
  }
});

arrowRight?.addEventListener('click', () => {
  if (activeSection < sections.length - 1) {
    activeSection += 1;
    updateSectionNav();
  }
});

updateSectionNav();

function userName(u) {
  return `${u.pn || u.fn} ${u.ln}`;
}

function setSidebarUser(u) {
  const nm = document.querySelector('.side-panel .name');
  if (nm) nm.textContent = userName(u);

  const img = document.querySelector('.side-panel .profile-image');
  if (img) {
    img.src = u.pp ? api.getAssetUrl(u.pp) : 'elements/pfpimage.png';
  }
}

function openProfile(uid) {
  localStorage.setItem('viewUid', uid);
  window.location.href = 'profile.html';
}

function getChecklistKey(tid) {
  return `teamChecklist:${tid}`;
}

function getStatusHistoryKey(tid) {
  return `teamStatusHistory:${tid}`;
}

function loadChecklist(tid) {
  try {
    const raw = localStorage.getItem(getChecklistKey(tid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveChecklist() {
  if (!currTeam) return;
  localStorage.setItem(getChecklistKey(currTeam.id), JSON.stringify(checklist));
}

function loadStatusHistory(tid) {
  try {
    const raw = localStorage.getItem(getStatusHistoryKey(tid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveStatusHistory() {
  if (!currTeam) return;
  localStorage.setItem(getStatusHistoryKey(currTeam.id), JSON.stringify(statusHistory));
}

function renderMembers(members) {
  const grid = document.querySelector('.memberGrid');
  if (!grid) return;
  grid.innerHTML = '';

  members.forEach((m) => {
    const blk = document.createElement('div');
    blk.className = 'memberBlock';
    blk.style.cursor = 'pointer';
    blk.addEventListener('click', () => openProfile(m.id));

    const img = document.createElement('img');
    img.className = 'pfpHome';
    img.alt = 'Profile';
    img.src = m.pp ? api.getAssetUrl(m.pp) : 'elements/pfpHome.png';

    const nm = document.createElement('div');
    nm.className = 'memberName';
    nm.textContent = userName(m);

    const cl = document.createElement('div');
    cl.className = 'memberName';
    cl.textContent = m.cl || '';

    blk.appendChild(img);
    blk.appendChild(nm);
    blk.appendChild(cl);
    grid.appendChild(blk);
  });
}

function renderChecklist() {
  const block = document.querySelector('.checklistBlock');
  if (!block) return;

  block.innerHTML = '<p class="checklistTitle">Checklist</p>';

  checklist.forEach((item, index) => {
    const row = document.createElement('label');
    row.className = 'checklistP';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!item.done;
    cb.addEventListener('change', () => {
      checklist[index].done = cb.checked;
      saveChecklist();

      const existingTimer = checklistRemoveTimers.get(item);
      if (existingTimer) {
        clearTimeout(existingTimer);
        checklistRemoveTimers.delete(item);
      }

      if (cb.checked) {
        const timeoutId = setTimeout(() => {
          const itemIndex = checklist.indexOf(item);
          if (itemIndex !== -1 && checklist[itemIndex].done) {
            checklist.splice(itemIndex, 1);
            saveChecklist();
            renderChecklist();
          }
        }, 2500);
        checklistRemoveTimers.set(item, timeoutId);
      }
    });

    const txt = document.createElement('span');
    txt.textContent = item.text;

    row.appendChild(cb);
    row.appendChild(txt);
    block.appendChild(row);
  });

  const plus = document.createElement('img');
  plus.src = 'elements/pluscheck.png';
  plus.alt = 'plus';
  plus.className = 'plusC';
  plus.style.cursor = 'pointer';
  plus.title = 'Add checklist item';
  plus.addEventListener('click', () => {
    const val = prompt('Add checklist item:');
    if (!val || !val.trim()) return;
    checklist.push({ text: val.trim(), done: false });
    saveChecklist();
    renderChecklist();
  });
  block.appendChild(plus);
}

function renderStatus() {
  const statusP = document.querySelector('.statusP');
  if (statusP) {
    const newest = statusHistory[0];
    statusP.textContent = newest || currTeam?.meta?.gl || 'No status updates yet.';
  }

  const plus = document.querySelector('.plusS');
  if (!plus) return;
  plus.onclick = async () => {
    const val = prompt('Enter a status update:');
    if (!val || !val.trim()) return;

    statusHistory.unshift(val.trim());
    if (statusHistory.length > 20) statusHistory = statusHistory.slice(0, 20);
    saveStatusHistory();

    if (currTeam && currUsr && currTeam.lid === currUsr.id) {
      await api.req(`/team/${currTeam.id}/meta`, {
        m: 'PUT',
        body: {
          pn: currTeam.meta?.pn || '',
          pd: currTeam.meta?.pd || '',
          gl: val.trim()
        }
      });
    }

    renderStatus();
    renderHistoryPopup();
  };
}

function renderHistoryPopup() {
  const popup = document.querySelector('.history-popup');
  const historyBtn = document.querySelector('.history');
  if (!popup || !historyBtn) return;

  if (statusHistory.length === 0) {
    popup.innerHTML = '<div class="history-item">No status history yet.</div>';
  } else {
    popup.innerHTML = statusHistory.map((s) => `<div class="history-item">${s}</div>`).join('');
  }

  historyBtn.onclick = () => {
    historyPopupOpen = !historyPopupOpen;
    popup.classList.toggle('show', historyPopupOpen);
    historyOverlay?.classList.toggle('show', historyPopupOpen);
  };
}

function renderTeam(team) {
  const title = document.querySelector('.section1 .title');
  const title2 = document.querySelector('.section2 .title2');
  const projectTitle = document.querySelector('.projectTitle');
  const projectDescription = document.querySelector('.projectDescription');

  if (!team) {
    if (title) title.textContent = 'NO TEAM YET';
    if (title2) title2.textContent = 'TEAM DASHBOARD';
    if (projectTitle) projectTitle.textContent = 'Join or Create a Team';
    if (projectDescription) projectDescription.textContent = 'Go to All Teams to create a new team or view current teams.';
    renderMembers([]);
    checklist = [];
    statusHistory = [];
    renderChecklist();
    renderStatus();
    renderHistoryPopup();
    return;
  }

  if (title) title.textContent = (team.tn || 'TEAM').toUpperCase();
  if (title2) title2.textContent = (team.tn || 'TEAM').toUpperCase();
  if (projectTitle) projectTitle.textContent = team.meta?.pn || 'PROJECT NAME';
  if (projectDescription) {
    projectDescription.textContent = team.meta?.pd || 'No project description yet.';
  }

  renderMembers(team.members || []);
  checklist = loadChecklist(team.id);
  statusHistory = loadStatusHistory(team.id);
  renderChecklist();
  renderStatus();
  renderHistoryPopup();
}

async function init() {
  if (!api.getTkn()) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const meRes = await api.req('/usr/profile');
    if (!meRes.ok) return;
    currUsr = meRes.data;
    if (api.isTeamAdminUser(currUsr)) {
      window.location.href = 'allTeams.html';
      return;
    }
    setSidebarUser(currUsr);

    const teamRes = await api.req('/team/my');
    if (!teamRes.ok) return;
    currTeam = teamRes.data;
    renderTeam(currTeam);
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
