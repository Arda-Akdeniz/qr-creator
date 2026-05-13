// Accordion toggle function
function toggleSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
}

document.addEventListener('DOMContentLoaded', function() {
    const fields = ['karekodno', 'tedas', 'marka', 'flag', 'model', 'modelkodu', 'serino', 'imaltarihi'];
    const customTextField = document.getElementById('customtext');
    const errorLevel = document.getElementById('errorLevel');
    const sizeMm = document.getElementById('sizeMm');
    const exportDxfBtn = document.getElementById('exportDxfBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const qrPreview = document.getElementById('qrPreview');
    const statusText = document.getElementById('statusText');
    const sizeText = document.getElementById('sizeText');
    const previewText = document.getElementById('previewText');

    let debounceTimer;

    // Check if ANY TEDAŞ QR KOD field has data
    function isTedasQrFilled() {
        return fields.some(fieldId => {
            const value = document.getElementById(fieldId).value.trim();
            return value.length > 0;
        });
    }

    // Check if custom text field is filled
    function isCustomTextFilled() {
        return customTextField.value.trim().length > 0;
    }

    // Lock/unlock fields based on which section is filled
    function updateFieldsLock() {
        const tedasHasData = isTedasQrFilled();
        const customFilled = isCustomTextFilled();

        if (tedasHasData) {
            // TEDAŞ QR KOD'da herhangi bir veri varsa, custom text'i kilitle
            fields.forEach(fieldId => {
                document.getElementById(fieldId).disabled = false;
                document.getElementById(fieldId).style.opacity = '1';
            });
            customTextField.disabled = true;
            customTextField.style.opacity = '0.5';
        } else if (customFilled) {
            // Custom text varsa, TEDAŞ QR KOD'u kilitle
            fields.forEach(fieldId => {
                document.getElementById(fieldId).disabled = true;
                document.getElementById(fieldId).style.opacity = '0.5';
            });
            customTextField.disabled = false;
            customTextField.style.opacity = '1';
        } else {
            // Hiçbirinde veri yoksa, hepsini aç
            fields.forEach(fieldId => {
                document.getElementById(fieldId).disabled = false;
                document.getElementById(fieldId).style.opacity = '1';
            });
            customTextField.disabled = false;
            customTextField.style.opacity = '1';
        }
    }

    function getFormData() {
        return {
            karekodno: document.getElementById('karekodno').value,
            tedas: document.getElementById('tedas').value,
            marka: document.getElementById('marka').value,
            flag: document.getElementById('flag').value,
            model: document.getElementById('model').value,
            modelkodu: document.getElementById('modelkodu').value,
            serino: document.getElementById('serino').value,
            imaltarihi: document.getElementById('imaltarihi').value,
            customtext: document.getElementById('customtext').value,
            error_level: errorLevel.value
        };
    }

    async function updatePreview() {
        const data = getFormData();

        // Check if TEDAŞ QR KOD fields have ANY data OR custom text is filled
        const tedasHasData = isTedasQrFilled();
        const customFilled = isCustomTextFilled();

        if (!tedasHasData && !customFilled) {
            qrPreview.innerHTML = `
                <div class="placeholder-animation">
                    <div class="animated-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <div class="digital-face">
                        <div class="face">
                            <div class="eye left-eye">
                                <div class="pupil left-pupil"></div>
                            </div>
                            <div class="eye right-eye">
                                <div class="pupil right-pupil"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            sizeText.textContent = '';
            showStatus('Veri giriniz', null);
            initializeFaceInteractions();
            return;
        }

        try {
            const response = await fetch('/api/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const error = await response.json();
                showStatus(error.error || 'Hata oluştu', 'error');
                qrPreview.innerHTML = `
                    <div class="placeholder-animation">
                        <div class="animated-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <div class="digital-face">
                            <div class="face">
                                <div class="eye left-eye">
                                    <div class="pupil left-pupil"></div>
                                </div>
                                <div class="eye right-eye">
                                    <div class="pupil right-pupil"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                sizeText.textContent = '';
                initializeFaceInteractions();
                return;
            }

            const result = await response.json();

            qrPreview.innerHTML = `
                <img src="${result.image}" alt="QR Code" style="position: relative; z-index: 2;">
                <div class="background-animation">
                    <div class="animated-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                    <div class="digital-face" style="opacity: 0.3;">
                        <div class="face">
                            <div class="eye left-eye">
                                <div class="pupil left-pupil"></div>
                            </div>
                            <div class="eye right-eye">
                                <div class="pupil right-pupil"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            sizeText.textContent = `• Boyut: ${result.size}`;
            showStatus('✓ Geçerli', 'valid');

        } catch (error) {
            console.error('Error:', error);
            showStatus('❌ Hata: ' + error.message, 'error');
            qrPreview.innerHTML = '<p>Veri giriniz</p>';
        }
    }

    function showStatus(message, type) {
        statusText.textContent = message;
        statusText.classList.remove('valid', 'error');
        if (type) {
            statusText.classList.add(type);
        }
    }

    // Debounce preview updates for text inputs
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', () => {
                updateFieldsLock();
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(updatePreview, 300);
            });
        }
    });

    // Custom text field listener
    if (customTextField) {
        customTextField.addEventListener('input', () => {
            updateFieldsLock();
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(updatePreview, 300);
        });
    }

    // Immediate update for select and number inputs
    if (errorLevel) {
        errorLevel.addEventListener('change', updatePreview);
    }

    if (sizeMm) {
        sizeMm.addEventListener('input', updatePreview);
        sizeMm.addEventListener('change', updatePreview);
    }

    // Initialize face interactions
    function initializeFaceInteractions() {
        const newLeftPupil = document.querySelector('.left-pupil');
        const newRightPupil = document.querySelector('.right-pupil');
        const newLeftEye = document.querySelector('.left-eye');
        const newRightEye = document.querySelector('.right-eye');
        const newFace = document.querySelector('.face');

        // Eye tracking
        if (newLeftPupil && newRightPupil && newLeftEye && newRightEye) {
            document.addEventListener('mousemove', (e) => {
                const mouseX = e.clientX;
                const mouseY = e.clientY;
                updatePupilSmooth(newLeftPupil, newLeftEye, mouseX, mouseY);
                updatePupilSmooth(newRightPupil, newRightEye, mouseX, mouseY);
            });
        }

        // Damage effect
        if (newFace) {
            newFace.addEventListener('click', () => {
                newFace.classList.add('damaged');
                newLeftPupil.textContent = '';
                newRightPupil.textContent = '';

                setTimeout(() => {
                    newFace.classList.remove('damaged');
                }, 600);
            });
        }
    }

    async function exportFile(format) {
        const data = getFormData();
        const endpoint = format === 'png' ? '/api/export-png' : '/api/export';
        const extension = format === 'png' ? 'png' : 'dxf';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...data,
                    size_mm: sizeMm.value
                })
            });

            if (!response.ok) {
                const error = await response.json();
                alert('Hata: ' + (error.error || 'Dosya indirilemiyor'));
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Dosya adını belirle
            let downloadName;
            if (data.customtext && !data.karekodno && !data.tedas && !data.marka && !data.flag && !data.model && !data.modelkodu && !data.serino && !data.imaltarihi) {
                downloadName = `qr_${data.customtext}.${extension}`;
            } else {
                downloadName = `qr_${data.karekodno}.${extension}`;
            }

            a.download = downloadName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showStatus('✓ İndirme başladı', 'valid');

        } catch (error) {
            console.error('Error:', error);
            alert('Hata: ' + error.message);
        }
    }

    if (exportDxfBtn) {
        exportDxfBtn.addEventListener('click', () => exportFile('dxf'));
    }

    if (exportPngBtn) {
        exportPngBtn.addEventListener('click', () => exportFile('png'));
    }

    // Digital face eye tracking - optimized
    const leftPupil = document.querySelector('.left-pupil');
    const rightPupil = document.querySelector('.right-pupil');
    const leftEye = document.querySelector('.left-eye');
    const rightEye = document.querySelector('.right-eye');
    const face = document.querySelector('.face');

    let mouseX = 0;
    let mouseY = 0;
    let animationFrameId = null;
    let isDamaged = false;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(() => {
                if (leftPupil && rightPupil && leftEye && rightEye) {
                    updatePupilSmooth(leftPupil, leftEye, mouseX, mouseY);
                    updatePupilSmooth(rightPupil, rightEye, mouseX, mouseY);
                }
                animationFrameId = null;
            });
        }
    });

    function updatePupilSmooth(pupil, eye, mouseX, mouseY) {
        const eyeRect = eye.getBoundingClientRect();
        const eyeCenterX = eyeRect.left + eyeRect.width / 2;
        const eyeCenterY = eyeRect.top + eyeRect.height / 2;

        const deltaX = mouseX - eyeCenterX;
        const deltaY = mouseY - eyeCenterY;
        const angle = Math.atan2(deltaY, deltaX);
        const distance = 5;

        const pupilX = Math.cos(angle) * distance;
        const pupilY = Math.sin(angle) * distance;

        pupil.style.left = `calc(50% + ${pupilX}px)`;
        pupil.style.top = `calc(50% + ${pupilY}px)`;
    }

    // Face damage interaction
    if (face) {
        face.addEventListener('click', () => {
            if (!isDamaged) {
                isDamaged = true;
                face.classList.add('damaged');

                // Recover after animation
                setTimeout(() => {
                    isDamaged = false;
                    face.classList.remove('damaged');
                }, 600);
            }
        });
    }

    // Initial state
    showStatus('Tüm alanları doldurun', null);
});
