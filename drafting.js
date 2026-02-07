// Drafting page - CS1 students only
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

// Check auth
if (!api.getTkn()) {
  window.location.href = 'login.html';
} else {
  loadCurrUsr();
}

async function loadCurrUsr() {
  try {
    const res = await api.req('/usr/profile');
    if (res.ok) {
      currUsr = res.data;
      
      // Update sidebar
      const nm = document.querySelector('.side-panel .name');
      if (nm) nm.textContent = `${currUsr.pn || currUsr.fn} ${currUsr.ln}`;
      
      const img = document.querySelector('.side-panel .profile-image');
      if (img && currUsr.pp) img.src = `https://eoyapi.monty.my${currUsr.pp}`;
      
      // Load all users for drafting
      loadAllUsrs();
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadAllUsrs() {
  try {
    const res = await api.req('/usr/all');
    if (res.ok) {
      renderUsrs(res.data);
    }
  } catch (e) {
    console.error(e);
    alert('Error loading users');
  }
}

function renderUsrs(usrs) {
  const grd = document.querySelector('.grid');
  if (!grd) return;
  
  grd.innerHTML = '';
  
  if (usrs.length === 0) {
    grd.innerHTML = '<p style="color: white; font-family: Montserrat; grid-column: 1/-1; text-align: center;">No other users found</p>';
    return;
  }
  
  usrs.forEach(u => {
    const blk = document.createElement('div');
    blk.className = 'profileBlock';
    
    const img = document.createElement('img');
    img.className = 'profileImage';
    img.alt = 'profileImage';
    img.src = u.pp ? `https://eoyapi.monty.my${u.pp}` : 'elements/profileImage.png';
    
    const nm = document.createElement('p');
    nm.className = 'name';
    nm.textContent = `${u.pn || u.fn} ${u.ln}`;
    
    const cls = document.createElement('p');
    cls.className = 'class';
    cls.textContent = u.cl;
    
    blk.appendChild(img);
    blk.appendChild(nm);
    blk.appendChild(cls);
    
    blk.onclick = () => {
      // Store user ID and go to profile page
      localStorage.setItem('viewUid', u.id);
      window.location.href = 'profile.html';
    };
    
    grd.appendChild(blk);
  });
}

// Logout
document.querySelector('.logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Logout?')) {
    api.clr();
    window.location.href = 'login.html';
  }
});
