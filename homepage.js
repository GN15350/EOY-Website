// Homepage/other pages
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

// Check auth
if (!api.getTkn()) {
  window.location.href = 'login.html';
} else {
  loadUsr();
}

async function loadUsr() {
  try {
    const res = await api.req('/usr/profile');
    if (res.ok) {
      const u = res.data;
      const nm = document.querySelector('.side-panel .name');
      if (nm) nm.textContent = `${u.pn || u.fn} ${u.ln}`;
      
      const img = document.querySelector('.side-panel .profile-image');
      if (img && u.pp) img.src = `https://eoyapi.monty.my${u.pp}`;
    }
  } catch (e) {
    console.error(e);
  }
}

// Logout
document.querySelector('.logout-link')?.addEventListener('click', (e) => {
  e.preventDefault();
  if (confirm('Logout?')) {
    api.clr();
    window.location.href = 'login.html';
  }
});
