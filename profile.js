
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

overlay?.addEventListener("click", closeMenu);

let currUsr = null;
let viewUsrId = localStorage.getItem('viewUid');


if (!api.getTkn()) {
  window.location.href = 'login.html';
} else {
  loadCurrUsr();
  if (viewUsrId) {
    loadViewUsr();
  }
}

async function loadCurrUsr() {
  try {
    const res = await api.req('/usr/profile');
    if (res.ok) {
      currUsr = res.data;
      
      const nm = document.querySelector('.side-panel .name');
      if (nm) nm.textContent = `${currUsr.pn || currUsr.fn} ${currUsr.ln}`;
      
      const img = document.querySelector('.side-panel .profile-image');
      if (img && currUsr.pp) img.src = `http://localhost:3000${currUsr.pp}`;
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadViewUsr() {
  try {
    const res = await api.req(`/usr/${viewUsrId}`);
    if (res.ok) {
      const u = res.data;
      

      const profImg = document.querySelector('.userProfile');
      if (profImg) profImg.src = u.pp ? `http://localhost:3000${u.pp}` : 'elements/userProfile.png';
      

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
      if (reqBtn) {
        if (currUsr && currUsr.cl === 'CS1') {
          reqBtn.onclick = () => sendReq(u);
        } else {
          reqBtn.style.display = 'none';
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function sendReq(usr) {
  try {
    const res = await api.req('/usr/request', {
      m: 'POST',
      body: { 
        toId: usr.id,
        toEm: usr.em,
        toNm: `${usr.pn || usr.fn} ${usr.ln}`
      }
    });
    
    if (res.ok) {
      alert('Request sent!');
      document.querySelector('.requestButton').disabled = true;
      document.querySelector('.requestButton').textContent = 'Request Sent';
    } else {
      alert(res.msg || 'Failed to send request');
    }
  } catch (e) {
    console.error(e);
    alert('Error sending request');
  }
}


document.querySelector('.logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Logout?')) {
    api.clr();
    window.location.href = 'login.html';
  }
});
