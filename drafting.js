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