const images = [
  "cs images/csimage1.png",
  "cs images/csimage2.png",
  "cs images/csimage3.png",
  "cs images/csimage4.png",
  "cs images/csimage5.png",
  "cs images/csimage6.jpg",
  "cs images/csimage7.jpg",
  "cs images/csimage8.jpg",
  "cs images/csimage9.jpeg",
  "cs images/csimage10.jpg"
];

let currentIndex = 0;
const imgElement = document.querySelector('.carousel-image');
const prevBtn = document.querySelector('.prev');
const nextBtn = document.querySelector('.next');
const fadeDurationMs = 500;
const autoAdvanceMs = 5000;
let autoSlideTimer;

function updateImage() {
  imgElement.style.opacity = 0;
  setTimeout(() => {
    imgElement.src = images[currentIndex];
    imgElement.style.opacity = 1;
  }, fadeDurationMs);
}

function goToPreviousImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  updateImage();
}

function goToNextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  updateImage();
}

function startAutoSlide() {
  if (!imgElement) return;
  autoSlideTimer = setInterval(() => {
    goToNextImage();
  }, autoAdvanceMs);
}

function restartAutoSlide() {
  clearInterval(autoSlideTimer);
  startAutoSlide();
}

if (prevBtn && imgElement) {
  prevBtn.addEventListener('click', () => {
    goToPreviousImage();
    restartAutoSlide();
  });
}

if (nextBtn && imgElement) {
  nextBtn.addEventListener('click', () => {
    goToNextImage();
    restartAutoSlide();
  });
}

startAutoSlide();
