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

    function generateQRText(data) {
        const customtext = data.customtext.trim();
        const vals = {
            'karekodno': data.karekodno.toUpperCase(),
            'tedas': data.tedas.toUpperCase(),
            'marka': data.marka.toUpperCase(),
            'flag': data.flag.toUpperCase(),
            'model': data.model.toUpperCase(),
            'modelkodu': data.modelkodu.toUpperCase(),
            'serino': data.serino.toUpperCase(),
            'imaltarihi': data.imaltarihi.toUpperCase(),
        };

        if (customtext && !vals.karekodno && !vals.tedas && !vals.marka && !vals.flag && !vals.model && !vals.modelkodu && !vals.serino && !vals.imaltarihi) {
            return customtext;
        } else if (vals.karekodno && vals.tedas && vals.marka && vals.flag && vals.model && vals.modelkodu && vals.serino && vals.imaltarihi) {
            vals.serino = vals.serino.replace(/\D/g, '').padStart(9, '0');
            vals.imaltarihi = vals.imaltarihi.length === 4 ? vals.imaltarihi.slice(-2) : vals.imaltarihi.padStart(2, '0');

            let qr_text = `||KAREKODNO_${vals.karekodno}|TEDASKIRILIM_${vals.tedas}|MARKA_${vals.marka}|FLAG_${vals.flag}|MODEL_${vals.model}|MODELKODU_${vals.modelkodu}|SERINO_${vals.serino}|IMALTARIHI_${vals.imaltarihi}||`;

            if (customtext) {
                qr_text += `|OZELMETIN_${customtext}|`;
            }
            return qr_text;
        }
        return null;
    }

    function updatePreview() {
        const data = getFormData();
        const tedasHasData = isTedasQrFilled();
        const customFilled = isCustomTextFilled();

        sizeText.textContent = `• Boyut: ${sizeMm.value} mm`;

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
            showStatus('Veri giriniz', null);
            initializeFaceInteractions();
            return;
        }

        const qrText = generateQRText(data);
        if (!qrText) {
            showStatus('Veri giriniz', 'error');
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
            initializeFaceInteractions();
            return;
        }

        try {
            const errorLevelMap = {
                'L': QRCode.CorrectLevel.L,
                'M': QRCode.CorrectLevel.M,
                'Q': QRCode.CorrectLevel.Q,
                'H': QRCode.CorrectLevel.H,
            };

            const canvas = document.createElement('canvas');
            const qr = new QRCode(canvas, {
                text: qrText,
                width: 280,
                height: 280,
                colorDark: '#000000',
                colorLight: '#FFFFFF',
                correctLevel: errorLevelMap[data.error_level] || QRCode.CorrectLevel.L
            });

            setTimeout(() => {
                const img = canvas.querySelector('img');
                if (img) {
                    qrPreview.innerHTML = `
                        <img src="${img.src}" alt="QR Code" style="position: relative; z-index: 2;">
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
                    sizeText.textContent = `• Boyut: ${sizeMm.value} mm`;
                    showStatus('✓ Geçerli', 'valid');
                    initializeFaceInteractions();
                }
            }, 100);

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
        errorLevel.onchange = updatePreview;
    }

    if (sizeMm) {
        sizeMm.oninput = updatePreview;
        sizeMm.onchange = updatePreview;
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

    function exportFile(format) {
        const data = getFormData();
        const qrText = generateQRText(data);

        if (!qrText) {
            alert('Lütfen geçerli veri giriniz');
            return;
        }

        try {
            const errorLevelMap = {
                'L': QRCode.CorrectLevel.L,
                'M': QRCode.CorrectLevel.M,
                'Q': QRCode.CorrectLevel.Q,
                'H': QRCode.CorrectLevel.H,
            };

            // Dosya adını belirle
            let downloadName;
            if (data.customtext && !data.karekodno && !data.tedas && !data.marka && !data.flag && !data.model && !data.modelkodu && !data.serino && !data.imaltarihi) {
                downloadName = `qr_${data.customtext}`;
            } else {
                downloadName = `qr_${data.karekodno}`;
            }

            if (format === 'png') {
                const tempDiv = document.createElement('div');
                const mmToPixel = sizeMm.value * (96 / 25.4);
                const pngSize = Math.round(mmToPixel);
                const qr = new QRCode(tempDiv, {
                    text: qrText,
                    width: pngSize,
                    height: pngSize,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: errorLevelMap[data.error_level] || QRCode.CorrectLevel.L
                });

                setTimeout(() => {
                    const img = tempDiv.querySelector('img');
                    if (img) {
                        const link = document.createElement('a');
                        link.href = img.src;
                        link.download = `${downloadName}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        showStatus('✓ İndirme başladı', 'valid');
                    }
                }, 200);

            } else if (format === 'dxf') {
                const tempDiv = document.createElement('div');
                const qr = new QRCode(tempDiv, {
                    text: qrText,
                    width: 280,
                    height: 280,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: errorLevelMap[data.error_level] || QRCode.CorrectLevel.L
                });

                setTimeout(() => {
                    const img = tempDiv.querySelector('img');
                    if (img) {
                        generateDXF(img, parseInt(sizeMm.value), downloadName);
                        showStatus('✓ İndirme başladı', 'valid');
                    }
                }, 200);
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Hata: ' + error.message);
        }
    }

    function generateDXF(imgElement, sizeMm, filename) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imgElement.width;
        canvas.height = imgElement.height;

        ctx.drawImage(imgElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        const entities = [];
        const blockSize = sizeMm / (canvas.width / 25.4);

        for (let i = 0; i < data.length; i += 4) {
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];

            if (red < 128 || green < 128 || blue < 128) {
                const pixelIndex = i / 4;
                const x = (pixelIndex % canvas.width) * blockSize;
                const y = Math.floor(pixelIndex / canvas.width) * blockSize;

                entities.push({
                    type: 'LWPOLYLINE',
                    points: [
                        [x, y],
                        [x + blockSize, y],
                        [x + blockSize, y + blockSize],
                        [x, y + blockSize]
                    ],
                    isClosed: true,
                    layer: 'QR'
                });
            }
        }

        const dxfContent = createDXFContent(entities);
        const blob = new Blob([dxfContent], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.dxf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function createDXFContent(entities) {
        let content = `999
DXF
0
SECTION
2
HEADER
9
$ACADVER
1
AC1021
9
$EXTMIN
10
0
20
0
30
0
9
$EXTMAX
10
1000
20
1000
30
0
0
ENDSEC
0
SECTION
2
ENTITIES
`;

        entities.forEach((entity, index) => {
            if (entity.type === 'LWPOLYLINE') {
                content += `0
LWPOLYLINE
8
${entity.layer}
90
${entity.points.length}
70
${entity.isClosed ? 1 : 0}
`;
                entity.points.forEach(point => {
                    content += `10
${point[0]}
20
${point[1]}
`;
                });
            }
        });

        content += `0
ENDSEC
0
EOF
`;
        return content;
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
