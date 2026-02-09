// Homepage/other pages
const sidepanel = document.getElementById("side-panel");
const overlay = document.getElementById("overlay");
const sections = Array.from(document.querySelectorAll(".section1, .section2"));
const arrowLeft = document.querySelector(".arrow-left");
const arrowRight = document.querySelector(".arrow-right");
let activeSection = 0;

function openMenu() {
  sidepanel.classList.add("open");
  overlay.classList.add("show");
}

function closeMenu() {
  sidepanel.classList.remove("open");
  overlay.classList.remove("show");
}

overlay?.addEventListener("click", closeMenu);

function updateSectionNav(shouldScroll = false) {
  if (shouldScroll && sections[activeSection]) {
    sections[activeSection].scrollIntoView({ behavior: "smooth", inline: "start" });
  }

  if (arrowLeft) {
    arrowLeft.classList.toggle("arrow-disabled", activeSection === 0);
  }
  if (arrowRight) {
    arrowRight.classList.toggle("arrow-disabled", activeSection === 1);
  }
}

arrowLeft?.addEventListener("click", () => {
  if (activeSection > 0) {
    activeSection -= 1;
    updateSectionNav(true);
  }
});

arrowRight?.addEventListener("click", () => {
  if (activeSection < 1) {
    activeSection += 1;
    updateSectionNav(true);
  }
});

function syncSectionFromScroll() {
  const idx = Math.round(window.scrollX / window.innerWidth);
  if (!Number.isNaN(idx) && idx !== activeSection) {
    activeSection = idx;
    updateSectionNav(false);
  }
}

window.addEventListener("scroll", syncSectionFromScroll, { passive: true });

updateSectionNav(false);

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
