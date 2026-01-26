const imageUploader = document.getElementById('imageUploader');
const profilePicInput = document.getElementById('profilePic');

imageUploader.addEventListener('click', () => {
    profilePicInput.click();
});

profilePicInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            imageUploader.innerHTML = `<img src="${e.target.result}" alt="Profile Picture">`;
        }
        reader.readAsDataURL(file);
    }
});



document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('idTechnicalSkills');
    const charCount = document.getElementById('techCharCount');

    textarea.addEventListener('input', () => {
        const length = textarea.value.length;
        charCount.textContent = `${length} / 200`;
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const softTextarea = document.getElementById('idSoftSkills');
    const softCharCount = document.getElementById('softCharCount');

    softTextarea.addEventListener('input', () => {
        const length = softTextarea.value.length;
        softCharCount.textContent = `${length} / 200`;
    });
});