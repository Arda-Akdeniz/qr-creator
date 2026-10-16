// Accordion toggle function
function toggleSection(header) {
    const content = header.nextElementSibling;
    header.classList.toggle('collapsed');
    content.classList.toggle('collapsed');
}

document.addEventListener('DOMContentLoaded', function() {
    const fields = ['tedas', 'marka', 'flag', 'model', 'modelkodu', 'serino', 'imaltarihi'];
    const customTextField = document.getElementById('customtext');
    const errorLevel = document.getElementById('errorLevel');
    const sizeMm = document.getElementById('sizeMm');
    const exportDxfBtn = document.getElementById('exportDxfBtn');
    const exportPngBtn = document.getElementById('exportPngBtn');
    const qrPreview = document.getElementById('qrPreview');
    const statusText = document.getElementById('statusText');
    const sizeText = document.getElementById('sizeText');
    const qrTextDisplay = document.getElementById('qrTextDisplay');
    const qrTextContent = document.getElementById('qrTextContent');
    const copyQrTextBtn = document.getElementById('copyQrTextBtn');

    let debounceTimer;
    let isRecording = false;
    let recordedTexts = [];

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

    // Karekod numarası = TEDAŞ kırılımı + FLAG + imal yılının son 2 hanesi + seri no (9 hane)
    function buildKarekodNo(data) {
        const tedas = data.tedas.trim().toUpperCase();
        const flag = data.flag.trim().toUpperCase();
        const yil = data.imaltarihi.replace(/\D/g, '').slice(-2);
        const seri = data.serino.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!tedas || !flag || !yil || !seri) return '';
        return `${tedas}${flag}${yil}${seri.padStart(9, '0')}`;
    }

    function getFormData() {
        return {
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

    // QR için zorunlu olup boş kalan alanların etiketlerini döndürür
    function getMissingFields(data) {
        const checks = [
            ['TEDAŞ KIRILIM', data.tedas.trim()],
            ['MARKA', data.marka.trim()],
            ['FLAG', data.flag.trim()],
            ['MODEL', data.model.trim()],
            ['MODEL KODU', data.modelkodu.trim()],
            ['SERİ NO', data.serino.replace(/[^A-Za-z0-9]/g, '')],
            ['İMAL TARİHİ', data.imaltarihi.replace(/\D/g, '')],
        ];
        return checks.filter(([, value]) => !value).map(([label]) => label);
    }

    function generateQRText(data) {
        const customtext = data.customtext.trim();
        const vals = {
            'tedas': data.tedas.toUpperCase(),
            'marka': data.marka.toUpperCase(),
            'flag': data.flag.toUpperCase(),
            'model': data.model.toUpperCase(),
            'modelkodu': data.modelkodu.toUpperCase(),
            'serino': data.serino.toUpperCase(),
            'imaltarihi': data.imaltarihi.toUpperCase(),
        };

        if (customtext && !vals.tedas && !vals.marka && !vals.flag && !vals.model && !vals.modelkodu && !vals.serino && !vals.imaltarihi) {
            return customtext;
        } else if (vals.tedas && vals.marka && vals.flag && vals.model && vals.modelkodu && vals.serino && vals.imaltarihi.replace(/\D/g, '')) {
            vals.serino = vals.serino.replace(/[^A-Z0-9]/g, '').padStart(9, '0');
            // Tarih: sadece rakamlar, boşluk/ayraçlar atılır (ör. 5.30.2026 -> 05302026)
            vals.imaltarihi = vals.imaltarihi.replace(/\D/g, '');
            if (vals.imaltarihi.length === 7) vals.imaltarihi = vals.imaltarihi.padStart(8, '0');
            const karekodno = buildKarekodNo(data);

            let qr_text = `||KAREKODNO_${karekodno}|TEDASKIRILIM_${vals.tedas}|MARKA_${vals.marka}|FLAG_${vals.flag}|MODEL_${vals.model}|MODELKODU_${vals.modelkodu}|SERINO_${vals.serino}|IMALTARIHI_${vals.imaltarihi}||`;

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
            const missing = getMissingFields(data);
            showStatus(missing.length ? `Eksik alanlar: ${missing.join(', ')}` : 'Veri giriniz', 'error');
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
            qrTextDisplay.style.display = 'none';
            initializeFaceInteractions();
            return;
        }

        qrTextContent.textContent = qrText;
        qrTextDisplay.style.display = 'block';

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
        syncFaceState();
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
            if (data.customtext && !data.tedas && !data.marka && !data.flag && !data.model && !data.modelkodu && !data.serino && !data.imaltarihi) {
                downloadName = `qr_${data.customtext}`;
            } else {
                downloadName = `qr_${buildKarekodNo(data)}`;
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

            } else if (format === 'svg') {
                const mmToPixel = sizeMm.value * (96 / 25.4);
                const svgSize = Math.round(mmToPixel);
                const tempDiv = document.createElement('div');
                const qr = new QRCode(tempDiv, {
                    text: qrText,
                    width: svgSize,
                    height: svgSize,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: errorLevelMap[data.error_level] || QRCode.CorrectLevel.L
                });

                setTimeout(() => {
                    const img = tempDiv.querySelector('img');
                    if (img) {
                        generateSVG(img, svgSize, downloadName);
                        showStatus('✓ İndirme başladı', 'valid');
                    }
                }, 200);
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Hata: ' + error.message);
        }
    }

    function generateSVG(imgElement, size, filename) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;

        ctx.drawImage(imgElement, 0, 0);
        const imageData = ctx.getImageData(0, 0, size, size);
        const data = imageData.data;

        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><g fill="black">`;

        for (let y = 0; y < size; y++) {
            let inBlock = false;
            let blockStart = 0;

            for (let x = 0; x <= size; x++) {
                const i = (y * size + x) * 4;
                const isBlack = x < size && (data[i] < 128 || data[i + 1] < 128 || data[i + 2] < 128);

                if (isBlack && !inBlock) {
                    inBlock = true;
                    blockStart = x;
                } else if (!isBlack && inBlock) {
                    svgContent += `<rect x="${blockStart}" y="${y}" width="${x - blockStart}" height="1"/>`;
                    inBlock = false;
                }
            }
        }

        svgContent += `</g></svg>`;

        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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

    const exportSvgBtn = document.getElementById('exportSvgBtn');
    if (exportSvgBtn) {
        exportSvgBtn.addEventListener('click', () => exportFile('svg'));
    }

    // Robot yüzü etkileşimi: 3 kez vurulunca sinirlenir, imleç yaklaşınca mavi kılıçla savunur
    const FACE_HITS_TO_ANGER = 3;
    const ANGER_CALM_DELAY_MS = 5000;   // son vuruştan sonra sakinleşme süresi
    const SWORD_RANGE_PX = 220;
    const SWORD_GUARD_SWING_DEG = 70;  // kılıcın öne doğru açılabileceği en fazla açı
    const SWORD_LENGTH_PX = 90;        // kılıç svg genişliği
    const SWORD_SIDE_SWITCH_PX = 30;   // kılıcın yan değiştirmesi için gereken yatay uzaklık
    const CALM_EFFECT_MS = 1000;       // kızgınlıktan normale geçiş süresi
    const SWORD_FOLLOW = 0.18;     // kılıcın imleci takip hızı (0-1)
    const SLASH_RANGE_PX = 90;
    const SLASH_COOLDOWN_MS = 450;

    let faceHits = 0;
    let isAngry = false;
    let angerTimer = null;
    let damageTimer = null;
    let mouseX = 0;
    let mouseY = 0;
    let eyeFrameId = null;
    let swordLoopId = null;
    let swordX = null;             // kılıç tutma noktası (yüz içi px)
    let guardSide = 1;             // kılıcın tutulduğu yan (-1 sol, 1 sağ)
    let swordY = null;
    let lastSlashAt = 0;

    const SWORD_SVG = `
        <svg class="robot-sword-blade" width="90" height="16" viewBox="0 0 90 16" aria-hidden="true">
            <defs>
                <linearGradient id="robotBladeGradient" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0" stop-color="#DC2626"/>
                    <stop offset="1" stop-color="#FECACA"/>
                </linearGradient>
            </defs>
            <rect x="0" y="6" width="12" height="4" rx="1" fill="#450A0A"/>
            <rect x="10" y="2" width="4" height="12" rx="1" fill="#991B1B"/>
            <polygon points="14,4 84,6.5 90,8 84,9.5 14,12" fill="url(#robotBladeGradient)"/>
        </svg>`;

    // Önizleme her render edildiğinde robot yeniden oluşturulduğu için her seferinde sorgulanır
    function getActiveFace() {
        return document.querySelector('#qrPreview .face');
    }

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

    function updateFaceEyes(face) {
        [['.left-pupil', '.left-eye'], ['.right-pupil', '.right-eye']].forEach(([pupilSel, eyeSel]) => {
            const pupil = face.querySelector(pupilSel);
            const eye = face.querySelector(eyeSel);
            if (pupil && eye) updatePupilSmooth(pupil, eye, mouseX, mouseY);
        });
    }

    function ensureSword(face) {
        let sword = face.querySelector('.robot-sword');
        if (!sword) {
            sword = document.createElement('div');
            sword.className = 'robot-sword';
            sword.innerHTML = SWORD_SVG;
            face.appendChild(sword);
        }
        return sword;
    }

    function removeSword(face) {
        const sword = face.querySelector('.robot-sword');
        if (sword) sword.remove();
        swordX = null;
        swordY = null;
    }

    function startSwordLoop() {
        if (swordLoopId === null) swordLoopId = requestAnimationFrame(tickSword);
    }

    function stopSwordLoop() {
        if (swordLoopId !== null) cancelAnimationFrame(swordLoopId);
        swordLoopId = null;
    }

    // Kızgınken kılıç her karede imlece doğru süzülür
    function tickSword() {
        swordLoopId = null;
        const face = getActiveFace();
        if (!isAngry || !face) return;
        updateSword(face);
        swordLoopId = requestAnimationFrame(tickSword);
    }

    // Kılıcın orta noktası imlecin üstüne gelir; tutma noktası imlecin gerisinde kalır, savunma duruşu böyle oluşur
    function updateSword(face) {
        const rect = face.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = mouseX - centerX;
        const deltaY = mouseY - centerY;
        const distance = Math.hypot(deltaX, deltaY);

        const sword = ensureSword(face);
        if (distance > SWORD_RANGE_PX) {
            sword.style.display = 'none';
            return;
        }
        sword.style.display = 'block';

        // Kılıç yanı yalnızca imleç merkezden belirgin uzaklaşınca değişir (titremeyi önler)
        if (Math.abs(deltaX) > SWORD_SIDE_SWITCH_PX) guardSide = deltaX < 0 ? -1 : 1;
        const forward = guardSide > 0 ? 0 : Math.PI;
        let offset = Math.atan2(deltaY, deltaX) - forward;
        offset = Math.atan2(Math.sin(offset), Math.cos(offset));
        const maxOffset = SWORD_GUARD_SWING_DEG * Math.PI / 180;
        offset = Math.max(-maxOffset, Math.min(maxOffset, offset));
        const angle = forward + offset;

        // Tutma noktası = imleç - kılıcın yarısı kadar, böylece kılıç imleci tam keser
        const scaleX = face.offsetWidth / rect.width;
        const scaleY = face.offsetHeight / rect.height;
        const cursorX = (mouseX - rect.left) * scaleX;
        const cursorY = (mouseY - rect.top) * scaleY;
        const half = SWORD_LENGTH_PX / 2;
        const targetX = cursorX - Math.cos(angle) * half;
        const targetY = cursorY - Math.sin(angle) * half;
        if (swordX === null) {
            swordX = targetX;
            swordY = targetY;
        }
        swordX += (targetX - swordX) * SWORD_FOLLOW;
        swordY += (targetY - swordY) * SWORD_FOLLOW;
        sword.style.left = `${swordX}px`;
        sword.style.top = `${swordY}px`;
        sword.style.transform = `translateY(-50%) rotate(${angle * 180 / Math.PI}deg)`;

        const now = performance.now();
        if (distance <= SLASH_RANGE_PX && now - lastSlashAt > SLASH_COOLDOWN_MS) {
            lastSlashAt = now;
            const blade = sword.querySelector('.robot-sword-blade');
            blade.classList.remove('slash');
            void blade.offsetWidth;
            blade.classList.add('slash');
        }
    }

    // Render sonrası yeni robota mevcut öfke durumunu uygula
    function syncFaceState() {
        const face = getActiveFace();
        if (!face) return;
        face.classList.toggle('angry', isAngry);
        if (isAngry) {
            startSwordLoop();
        } else {
            removeSword(face);
        }
    }

    // Sakinleşme: kırmızıdan mor ve maviden geçip normale döner
    let calmingTimer = null;
    function calmDown() {
        isAngry = false;
        faceHits = 0;
        stopSwordLoop();
        const face = getActiveFace();
        if (face) {
            face.classList.remove('angry');
            face.classList.add('calming');
            removeSword(face);
            clearTimeout(calmingTimer);
            calmingTimer = setTimeout(() => face.classList.remove('calming'), CALM_EFFECT_MS);
            startFrameSync();
        }
    }

    // Robotun o anki rengi (kızgınlık ve sakinleşme animasyonu dahil); çerçeve ve efektler bu rengi alır
    function getRobotRgb(face) {
        const parts = getComputedStyle(face).backgroundColor.match(/\d+(\.\d+)?/g);
        return parts ? parts.slice(0, 3).map(Number) : [20, 184, 166];
    }

    function rgba(rgb, alpha) {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
    }

    // Önizleme çerçevesini robotla aynı renkte tutar; kızgın ya da sakinleşirken her karede güncellenir
    let frameFrameId = null;
    function syncPreviewFrame() {
        const face = getActiveFace();
        const container = document.querySelector('.preview-container');
        if (!face || !container) {
            frameFrameId = null;
            return;
        }
        if (face.classList.contains('angry') || face.classList.contains('calming') || face.classList.contains('damaged')) {
            const rgb = getRobotRgb(face);
            container.style.transition = 'none';
            container.style.borderColor = rgba(rgb, 1);
            container.style.boxShadow = `0 0 20px ${rgba(rgb, 0.35)}, inset 0 0 18px ${rgba(rgb, 0.1)}`;
            frameFrameId = requestAnimationFrame(syncPreviewFrame);
        } else {
            frameFrameId = null;
            container.style.borderColor = '';
            container.style.boxShadow = '';
            container.style.transition = '';
        }
    }

    // Çerçeve de yüzle birlikte sarsılır
    let frameShakeTimer = null;
    function shakePreviewFrame() {
        const container = document.querySelector('.preview-container');
        if (!container) return;
        container.classList.remove('damaged');
        void container.offsetWidth;
        container.classList.add('damaged');
        clearTimeout(frameShakeTimer);
        frameShakeTimer = setTimeout(() => container.classList.remove('damaged'), 600);
    }

    function startFrameSync() {
        if (frameFrameId === null) frameFrameId = requestAnimationFrame(syncPreviewFrame);
    }

    // Çarpışma kıvılcımları: vuruş noktasından dağılan parçacıklar, robotun rengiyle
    function spawnSparks(face, clientX, clientY) {
        const rect = face.getBoundingClientRect();
        const originX = (clientX - rect.left) * (face.offsetWidth / rect.width);
        const originY = (clientY - rect.top) * (face.offsetHeight / rect.height);

        for (let i = 0; i < 6; i++) {
            const spark = document.createElement('span');
            spark.className = 'spark';
            const sparkRgb = getRobotRgb(face);
            spark.style.background = rgba(sparkRgb, 1);
            spark.style.boxShadow = `0 0 6px ${rgba(sparkRgb, 0.9)}`;
            const angle = Math.random() * Math.PI * 2;
            const distance = 22 + Math.random() * 18;
            spark.style.left = `${originX}px`;
            spark.style.top = `${originY}px`;
            spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
            spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
            spark.addEventListener('animationend', () => spark.remove());
            face.appendChild(spark);
        }
    }

    // Kılıç açıkken vuruş gelince: kılıç savrulup bloklar, kıvılcım çıkar, robot geriye teper
    let recoilTimer = null;
    function parryWith(sword, face, clientX, clientY) {
        const blade = sword.querySelector('.robot-sword-blade');
        blade.classList.remove('slash', 'parry');
        void blade.offsetWidth;
        blade.classList.add('parry');
        blade.addEventListener('animationend', () => blade.classList.remove('parry'), { once: true });

        spawnHitFlash(face, clientX, clientY);
        spawnSparks(face, clientX, clientY);

        // Tepki, saldırının tersi yönünde; animasyon ebeveyn katmanda çalışır ki yüzün sarsıntısıyla çakışmasın
        const rect = face.getBoundingClientRect();
        const deltaX = clientX - (rect.left + rect.width / 2);
        const deltaY = clientY - (rect.top + rect.height / 2);
        const length = Math.hypot(deltaX, deltaY) || 1;
        const recoilEl = face.parentElement;
        recoilEl.style.setProperty('--kx', deltaX / length);
        recoilEl.style.setProperty('--ky', deltaY / length);
        recoilEl.classList.remove('recoil');
        void recoilEl.offsetWidth;
        recoilEl.classList.add('recoil');
        clearTimeout(recoilTimer);
        recoilTimer = setTimeout(() => recoilEl.classList.remove('recoil'), 400);
    }

    // Tıklama noktasında mavi ışık patlaması
    function spawnHitFlash(face, clientX, clientY) {
        const rect = face.getBoundingClientRect();
        const flash = document.createElement('span');
        flash.className = 'hit-flash';
        const flashRgb = getRobotRgb(face);
        flash.style.background = `radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, ${rgba(flashRgb, 0.75)} 30%, ${rgba(flashRgb, 0)} 70%)`;
        flash.style.boxShadow = `0 0 18px ${rgba(flashRgb, 0.9)}`;
        flash.style.left = `${(clientX - rect.left) * (face.offsetWidth / rect.width)}px`;
        flash.style.top = `${(clientY - rect.top) * (face.offsetHeight / rect.height)}px`;
        flash.addEventListener('animationend', () => flash.remove());
        face.appendChild(flash);
    }

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
        if (eyeFrameId === null) {
            eyeFrameId = requestAnimationFrame(() => {
                eyeFrameId = null;
                const face = getActiveFace();
                if (face) updateFaceEyes(face);
            });
        }
    });

    // Robota tıklama: ışık efekti, sarsıntı ve vuruş sayımı
    // Kılıcı savurarak blokla: kıvılcım çıkar, savrulma ve ışık olmadan
    function blockWithSword(sword, face, clientX, clientY) {
        const blade = sword.querySelector('.robot-sword-blade');
        blade.classList.remove('slash', 'parry');
        void blade.offsetWidth;
        blade.classList.add('parry');
        blade.addEventListener('animationend', () => blade.classList.remove('parry'), { once: true });
        spawnSparks(face, clientX, clientY);
    }

    // Kızgınken vuruş isabet etmez: robot tıklamanın ters yönüne hızla kaçar ve geri döner
    function dodgeAway(face, clientX, clientY) {
        const rect = face.getBoundingClientRect();
        const deltaX = clientX - (rect.left + rect.width / 2);
        const deltaY = clientY - (rect.top + rect.height / 2);
        const length = Math.hypot(deltaX, deltaY) || 1;
        const dodgeEl = face.parentElement;
        dodgeEl.style.setProperty('--kx', deltaX / length);
        dodgeEl.style.setProperty('--ky', deltaY / length);
        dodgeEl.classList.remove('recoil', 'dodge');
        void dodgeEl.offsetWidth;
        dodgeEl.classList.add('dodge');
        clearTimeout(recoilTimer);
        recoilTimer = setTimeout(() => dodgeEl.classList.remove('dodge'), 450);
    }

    // Robota tıklama: kızgınken kaçar, sakinken sersemler
    document.addEventListener('click', (e) => {
        const face = e.target.closest('#qrPreview .face');
        if (!face) return;
        const sword = face.querySelector('.robot-sword');
        const swordOut = sword && sword.style.display === 'block';

        if (isAngry) {
            if (swordOut) blockWithSword(sword, face, e.clientX, e.clientY);
            dodgeAway(face, e.clientX, e.clientY);
            // Kızgınken her tıklama öfkeyi uzatır: sakinleşme son tıklamadan sonra başlar
            clearTimeout(angerTimer);
            angerTimer = setTimeout(calmDown, ANGER_CALM_DELAY_MS);
            return;
        }

        // Kılıç görünürken vuruş savunmayla karşılanır (ışık, kıvılcım, savrulma)
        if (swordOut) parryWith(sword, face, e.clientX, e.clientY);

        // Her vuruş sersemletir: yüz sarsılır, renk parlar ve arka plan çerçevesi de aynı efekti alır
        face.classList.remove('damaged');
        void face.offsetWidth;
        face.classList.add('damaged');
        clearTimeout(damageTimer);
        damageTimer = setTimeout(() => face.classList.remove('damaged'), 600);
        startFrameSync();
        shakePreviewFrame();

        faceHits++;
        if (faceHits >= FACE_HITS_TO_ANGER) {
            isAngry = true;
            clearTimeout(calmingTimer);
            face.classList.remove('calming');
            face.classList.add('angry');
            startSwordLoop();
            startFrameSync();
            clearTimeout(angerTimer);
            angerTimer = setTimeout(calmDown, ANGER_CALM_DELAY_MS);
        }
    });

    // Copy QR text to clipboard
    if (copyQrTextBtn) {
        copyQrTextBtn.addEventListener('click', () => {
            const text = qrTextContent.textContent;
            if (text) {
                navigator.clipboard.writeText(text).then(() => {
                    const originalText = copyQrTextBtn.innerHTML;
                    copyQrTextBtn.innerHTML = '<i class="fas fa-check"></i> Kopyalandı!';
                    setTimeout(() => {
                        copyQrTextBtn.innerHTML = originalText;
                    }, 2000);
                }).catch(() => {
                    alert('Kopyalama başarısız oldu');
                });
            }
        });
    }

    // Save current QR text
    const saveQrTextBtn = document.getElementById('saveQrTextBtn');
    if (saveQrTextBtn) {
        saveQrTextBtn.addEventListener('click', () => {
            const currentText = qrTextContent.textContent;
            if (!currentText) {
                alert('Kaydedilecek metin yok. Lütfen QR kod oluşturun.');
                return;
            }

            recordedTexts.push(currentText);

            const downloadBtn = document.getElementById('downloadSavedBtn');
            if (downloadBtn) {
                downloadBtn.disabled = false;
            }

            showStatus(`✓ Metin kaydedildi (Toplam: ${recordedTexts.length})`, 'valid');
        });
    }

    // Download saved QR texts
    const downloadSavedBtn = document.getElementById('downloadSavedBtn');
    if (downloadSavedBtn) {
        downloadSavedBtn.disabled = true;
        downloadSavedBtn.addEventListener('click', () => {
            if (recordedTexts.length === 0) {
                alert('İndirilecek kaydedilmiş metin yok');
                return;
            }

            const textContent = recordedTexts.join('\n');
            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR_Metinleri_${new Date().toLocaleString('tr-TR').replace(/[:./-]/g, '_')}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showStatus(`✓ ${recordedTexts.length} adet metin indirildi`, 'valid');
            recordedTexts = [];
            downloadSavedBtn.disabled = true;
        });
    }

    // Seri Numarası Aralığı Oluşturma
    const generateSeriesBtn = document.getElementById('generateSeriesBtn');
    const seriesOutput = document.getElementById('seriesOutput');
    const serinoStartInput = document.getElementById('serino_start');
    const serinoEndInput = document.getElementById('serino_end');
    const serinoField = document.getElementById('serino');
    const productTypeGen = document.getElementById('productTypeGen');
    const downloadSeriesBtn = document.getElementById('downloadSeriesBtn');
    let generatedSeries = [];

    // Ürün tipine göre seri numarası haneli sayısını belirle
    function getSerialNumberLength() {
        return productTypeGen.value === 'electric_meter' ? 9 : 6;
    }

    function formatSerialNumber(num) {
        const length = getSerialNumberLength();
        return String(num).padStart(length, '0');
    }

    function downloadSeriesToTxt() {
        if (generatedSeries.length === 0) {
            alert('İndirilecek seri numarası yok');
            return;
        }

        const content = generatedSeries.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;

        const timestamp = new Date().toLocaleString('tr-TR').replace(/[:./-]/g, '_');
        const typeText = productTypeGen.value === 'electric_meter' ? '9H' : '6H';
        link.download = `Seri_Numaralari_${typeText}_${timestamp}.txt`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function generateSeries() {
        const startVal = parseInt(serinoStartInput.value);
        const endVal = parseInt(serinoEndInput.value);

        if (isNaN(startVal) || isNaN(endVal)) {
            seriesOutput.innerHTML = '<span style="color: var(--error);">Geçerli sayı girin</span>';
            seriesOutput.classList.remove('empty');
            return;
        }

        if (startVal > endVal) {
            seriesOutput.innerHTML = '<span style="color: var(--error);">Başlangıç bitiş değerinden küçük olmalı</span>';
            seriesOutput.classList.remove('empty');
            return;
        }

        if (endVal - startVal > 1000) {
            seriesOutput.innerHTML = '<span style="color: var(--error);">Maksimum 1000 adet seri numarası oluşturabilirsiniz</span>';
            seriesOutput.classList.remove('empty');
            return;
        }

        seriesOutput.innerHTML = '';
        const fragment = document.createDocumentFragment();
        generatedSeries = [];

        for (let i = startVal; i <= endVal; i++) {
            const formattedNum = formatSerialNumber(i);
            generatedSeries.push(formattedNum);

            const item = document.createElement('div');
            item.className = 'series-item';
            item.textContent = formattedNum;
            item.addEventListener('click', () => {
                serinoField.value = formattedNum;
                serinoField.dispatchEvent(new Event('input', { bubbles: true }));
                serinoField.focus();
            });
            fragment.appendChild(item);
        }

        seriesOutput.appendChild(fragment);
        seriesOutput.classList.remove('empty');

        // İndirme butonunu göster
        if (downloadSeriesBtn) {
            downloadSeriesBtn.style.display = 'flex';
        }
    }

    if (generateSeriesBtn) {
        generateSeriesBtn.addEventListener('click', generateSeries);
    }

    // Enter tuşu ile oluştur
    if (serinoEndInput) {
        serinoEndInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                generateSeries();
            }
        });
    }

    // Ürün tipi değiştiğinde
    if (productTypeGen) {
        productTypeGen.addEventListener('change', () => {
            // Önceki seri numaralarını temizle
            seriesOutput.innerHTML = '';
            seriesOutput.classList.add('empty');
            generatedSeries = [];

            // Input'ları temizle
            serinoStartInput.value = '';
            serinoEndInput.value = '';

            // İndirme butonunu gizle
            if (downloadSeriesBtn) {
                downloadSeriesBtn.style.display = 'none';
            }

            const length = getSerialNumberLength();
            const typeText = productTypeGen.value === 'electric_meter' ? '9 haneli' : '6 haneli';
            showStatus(`Ürün tipi değiştirildi - Seri numarası ${typeText}`, null);
        });
    }

    // İndirme butonu event listener'ı
    if (downloadSeriesBtn) {
        downloadSeriesBtn.addEventListener('click', downloadSeriesToTxt);
    }

    // Toplu QR metni oluşturma (sabit bilgiler + seri aralığı + tarih)
    const batchFieldIds = {
        tedas: 'batchTedas',
        marka: 'batchMarka',
        flag: 'batchFlag',
        model: 'batchModel',
        modelkodu: 'batchModelkodu',
    };
    const batchFieldLabels = {
        tedas: 'TEDAŞ KIRILIM',
        marka: 'MARKA',
        flag: 'FLAG',
        model: 'MODEL',
        modelkodu: 'MODEL KODU',
    };
    const batchStartInput = document.getElementById('batchStart');
    const batchEndInput = document.getElementById('batchEnd');
    const batchDateInput = document.getElementById('batchDate');
    const batchDateLabel = document.getElementById('batchDateLabel');
    const batchDateMode = document.getElementById('batchDateMode');
    const batchStepWrap = document.getElementById('batchStepWrap');
    const batchStepInput = document.getElementById('batchStep');
    const batchDatesWrap = document.getElementById('batchDatesWrap');
    const batchDatesInput = document.getElementById('batchDates');
    const batchFillBtn = document.getElementById('batchFillBtn');
    const batchGenerateBtn = document.getElementById('batchGenerateBtn');
    const batchStatus = document.getElementById('batchStatus');
    const batchOutput = document.getElementById('batchOutput');
    const batchCopyBtn = document.getElementById('batchCopyBtn');
    const batchDownloadBtn = document.getElementById('batchDownloadBtn');
    let batchResults = [];

    function setBatchStatus(message, type) {
        batchStatus.textContent = message;
        batchStatus.classList.remove('valid', 'error');
        if (type) batchStatus.classList.add(type);
    }

    function clearBatchOutput() {
        batchOutput.innerHTML = '';
        batchOutput.classList.add('empty');
        batchResults = [];
        batchCopyBtn.style.display = 'none';
        batchDownloadBtn.style.display = 'none';
    }

    function getBatchFixedData() {
        const data = {};
        Object.keys(batchFieldIds).forEach(key => {
            data[key] = document.getElementById(batchFieldIds[key]).value.trim();
        });
        return data;
    }

    // GG.AA.YYYY metnini Date'e çevirir (geçersizse null)
    function parseDMY(text) {
        const m = text.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
        if (!m) return null;
        const day = parseInt(m[1]), month = parseInt(m[2]), year = parseInt(m[3]);
        const date = new Date(Date.UTC(year, month - 1, day));
        if (date.getUTCDate() !== day || date.getUTCMonth() !== month - 1) return null;
        return date;
    }

    // Date'i GG.AA.YYYY olarak biçimler
    function formatDMY(date) {
        const dd = String(date.getUTCDate()).padStart(2, '0');
        const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
        return `${dd}.${mm}.${date.getUTCFullYear()}`;
    }

    // Ana formdaki sabit bilgileri ve tarihi kopyala
    batchFillBtn.addEventListener('click', () => {
        Object.keys(batchFieldIds).forEach(key => {
            document.getElementById(batchFieldIds[key]).value = document.getElementById(key).value;
        });
        batchDateInput.value = document.getElementById('imaltarihi').value;
        setBatchStatus('Ana formdan dolduruldu', 'valid');
    });

    // Tarih modu değişince ilgili alanları göster/gizle
    function updateBatchDateMode() {
        const mode = batchDateMode.value;
        batchStepWrap.style.display = mode === 'auto' ? 'flex' : 'none';
        batchDatesWrap.style.display = mode === 'list' ? 'flex' : 'none';
        batchDateInput.disabled = mode === 'list';
        batchDateInput.style.opacity = mode === 'list' ? '0.5' : '1';
        batchDateLabel.textContent = mode === 'auto' ? 'BAŞLANGIÇ TARİHİ' : 'İMAL TARİHİ';
    }

    batchDateMode.addEventListener('change', () => {
        updateBatchDateMode();
        clearBatchOutput();
        setBatchStatus('', null);
    });

    // Seçilen tarih moduna göre her seri için tarihleri hazırlar (hata varsa null)
    function buildBatchDates(count) {
        const mode = batchDateMode.value;

        if (mode === 'list') {
            const dates = batchDatesInput.value.split('\n').map(d => d.trim()).filter(Boolean);
            if (dates.length !== count) {
                setBatchStatus(`Tarih sayısı (${dates.length}) seri sayısıyla (${count}) eşleşmiyor`, 'error');
                return null;
            }
            return dates;
        }

        if (mode === 'auto') {
            const start = parseDMY(batchDateInput.value);
            if (!start) {
                setBatchStatus('Başlangıç tarihi geçersiz (GG.AA.YYYY)', 'error');
                return null;
            }
            const step = parseInt(batchStepInput.value);
            if (isNaN(step) || step < 1) {
                setBatchStatus('Artış en az 1 gün olmalı', 'error');
                return null;
            }
            return Array.from({ length: count }, (_, k) => {
                const d = new Date(start);
                d.setUTCDate(d.getUTCDate() + k * step);
                return formatDMY(d);
            });
        }

        const single = batchDateInput.value.trim();
        if (!single) {
            setBatchStatus('İmal tarihi girin', 'error');
            return null;
        }
        return Array(count).fill(single);
    }

    function generateBatchQRTexts() {
        const start = parseInt(batchStartInput.value);
        const end = parseInt(batchEndInput.value);

        if (isNaN(start) || isNaN(end)) {
            setBatchStatus('Başlangıç ve bitiş seri numarası girin', 'error');
            return clearBatchOutput();
        }
        if (start > end) {
            setBatchStatus('Başlangıç bitiş değerinden küçük olmalı', 'error');
            return clearBatchOutput();
        }
        if (end - start > 1000) {
            setBatchStatus('Maksimum 1000 adet QR metni oluşturabilirsiniz', 'error');
            return clearBatchOutput();
        }

        const fixed = getBatchFixedData();
        const missing = Object.keys(batchFieldLabels)
            .filter(key => !fixed[key])
            .map(key => batchFieldLabels[key]);
        if (missing.length) {
            setBatchStatus(`Sabit alanlar eksik: ${missing.join(', ')}`, 'error');
            return clearBatchOutput();
        }

        const count = end - start + 1;
        const dates = buildBatchDates(count);
        if (!dates) return clearBatchOutput();

        const results = [];
        for (let i = start; i <= end; i++) {
            const k = i - start;
            const serino = formatSerialNumber(i);
            const text = generateQRText({
                ...fixed,
                serino,
                imaltarihi: dates[k],
                customtext: '',
                error_level: errorLevel.value,
            });
            if (!text) {
                setBatchStatus(`Seri ${serino} için tarih geçersiz: "${dates[k]}"`, 'error');
                return clearBatchOutput();
            }
            results.push({ serino, text, date: dates[k] });
        }

        batchResults = results;
        batchOutput.innerHTML = '';
        const fragment = document.createDocumentFragment();
        results.forEach(({ serino, text, date }) => {
            const row = document.createElement('div');
            row.className = 'batch-row';
            const serial = document.createElement('span');
            serial.className = 'batch-serial';
            serial.textContent = serino;
            const dateEl = document.createElement('span');
            dateEl.className = 'batch-date';
            dateEl.textContent = date;
            const content = document.createElement('code');
            content.textContent = text;
            row.append(serial, dateEl, content);
            fragment.appendChild(row);
        });
        batchOutput.appendChild(fragment);
        batchOutput.classList.remove('empty');
        batchCopyBtn.style.display = 'flex';
        batchDownloadBtn.style.display = 'flex';
        setBatchStatus(`✓ ${results.length} adet QR metni oluşturuldu`, 'valid');
    }

    function getBatchTextLines() {
        return batchResults.map(r => r.text).join('\n');
    }

    batchGenerateBtn.addEventListener('click', generateBatchQRTexts);

    batchCopyBtn.addEventListener('click', async () => {
        if (batchResults.length === 0) return;
        try {
            await navigator.clipboard.writeText(getBatchTextLines());
            setBatchStatus(`✓ ${batchResults.length} adet metin kopyalandı`, 'valid');
        } catch (err) {
            setBatchStatus('Kopyalama başarısız oldu', 'error');
        }
    });

    batchDownloadBtn.addEventListener('click', () => {
        if (batchResults.length === 0) return;
        const blob = new Blob([getBatchTextLines()], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `QR_Metinleri_${batchResults.length}_adet.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });

    // Initial state
    showStatus('Tüm alanları doldurun', null);
});
