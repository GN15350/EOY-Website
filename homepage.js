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

const pageWrapper = document.querySelector(".pageWrapper");
const arrowLeft = document.querySelector(".arrow-left");
const arrowRight = document.querySelector(".arrow-right");

let currentPage = 0;

function updateArrows() {
    if (currentPage === 0) {
        arrowLeft.style.opacity = "0.3";
        arrowLeft.style.pointerEvents = "none";
        arrowRight.style.opacity = "1";
        arrowRight.style.pointerEvents = "auto";
    } else {
        arrowRight.style.opacity = "0.3";
        arrowRight.style.pointerEvents = "none";
        arrowLeft.style.opacity = "1";
        arrowLeft.style.pointerEvents = "auto";
    }
}

updateArrows();

arrowRight.addEventListener("click", () => {
    if (currentPage === 0) {
        pageWrapper.style.transform = "translateX(-100vw)";
        currentPage = 1;
        updateArrows();
    }
});

arrowLeft.addEventListener("click", () => {
    if (currentPage === 1) {
        pageWrapper.style.transform = "translateX(0)";
        currentPage = 0;
        updateArrows();
    }
});



const history = document.getElementById("history-popup");

function openHistory() {
    history.classList.add("show");
}

function closeHistory() {
    historylassList.remove("show");
}

history.addEventListener("click", openHistory);
overlay.addEventListener("click", closeHistory);

