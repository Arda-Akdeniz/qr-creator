import sys
from datetime import datetime
from pathlib import Path

from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QComboBox, QSpinBox,
    QFrame, QScrollArea, QFileDialog, QMessageBox, QGridLayout
)
from PyQt6.QtGui import QPixmap, QFont, QIcon
from PyQt6.QtCore import Qt, QSize, pyqtSignal, QObject

from qr_generator import QRGenerator
from dxf_exporter import DXFExporter


class QRSignals(QObject):
    update_preview = pyqtSignal(QPixmap)


class QRCreatorApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.signals = QRSignals()
        self.signals.update_preview.connect(self.on_preview_update)

        self.qr_gen = QRGenerator()
        self.dxf_exp = DXFExporter()

        self.setWindowTitle("QR CREATOR")
        self.setGeometry(100, 100, 1200, 700)
        self.setWindowIcon(self.create_icon())

        # Load modern teal stylesheet
        self.load_stylesheet()

        # Build UI
        self.init_ui()

        self.show()

    def load_stylesheet(self):
        """Load Modern Teal QSS stylesheet."""
        style_path = Path(__file__).parent / "styles.qss"
        if style_path.exists():
            with open(style_path, 'r', encoding='utf-8') as f:
                self.setStyleSheet(f.read())

    def create_icon(self):
        """Create a simple teal icon."""
        pixmap = QPixmap(32, 32)
        pixmap.fill(Qt.GlobalColor.transparent)
        return QIcon(pixmap)

    def init_ui(self):
        """Initialize user interface."""
        central_widget = QWidget()
        self.setCentralWidget(central_widget)

        # Main vertical layout
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Horizontal layout for input and preview
        content_layout = QHBoxLayout()
        content_layout.setContentsMargins(0, 0, 0, 0)
        content_layout.setSpacing(0)

        # Left: Input Zone
        left_widget = self.create_input_zone()
        content_layout.addWidget(left_widget, 40)

        # Right: Preview Zone
        right_widget = self.create_preview_zone()
        content_layout.addWidget(right_widget, 60)

        main_layout.addLayout(content_layout, 1)

        # Bottom: Settings Bar
        bottom_widget = self.create_settings_bar()
        main_layout.addWidget(bottom_widget)

    def create_input_zone(self):
        """Create left input panel with grouped fields."""
        frame = QFrame()
        frame.setObjectName("inputFrame")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        # Title
        title = QLabel("QR VERİ GİR")
        title.setObjectName("title")
        title.setFont(QFont("Inter", 18, QFont.Weight.Bold))
        layout.addWidget(title)

        # Input fields dictionary
        self.fields = {}

        # ===== TEMEL BİLGİLER (Basic Info Group) =====
        basic_group = QFrame()
        basic_layout = QVBoxLayout(basic_group)
        basic_layout.setContentsMargins(12, 12, 12, 12)
        basic_layout.setSpacing(10)

        basic_title = QLabel("● TEMEL BİLGİLER")
        basic_title.setObjectName("subtitle")
        basic_title.setFont(QFont("Inter", 12, QFont.Weight.Bold))
        basic_layout.addWidget(basic_title)

        basic_fields = [
            ("karekodno", "KAREKOD NO"),
            ("serino", "SERİ NO"),
            ("imaltarihi", "İMAL YILI"),
        ]

        for key, label in basic_fields:
            label_widget = QLabel(label)
            label_widget.setObjectName("subtitle")
            label_widget.setFont(QFont("Inter", 11))
            basic_layout.addWidget(label_widget)

            input_field = QLineEdit()
            input_field.setPlaceholderText(f"{label} gir...")
            input_field.setMinimumHeight(32)
            input_field.textChanged.connect(self.on_input_changed)
            self.fields[key] = input_field
            basic_layout.addWidget(input_field)

        layout.addWidget(basic_group)

        # ===== ÜRÜN BİLGİLERİ (Product Info Group) =====
        product_group = QFrame()
        product_layout = QVBoxLayout(product_group)
        product_layout.setContentsMargins(12, 12, 12, 12)
        product_layout.setSpacing(10)

        product_title = QLabel("● ÜRÜN BİLGİLERİ")
        product_title.setObjectName("subtitle")
        product_title.setFont(QFont("Inter", 12, QFont.Weight.Bold))
        product_layout.addWidget(product_title)

        product_fields = [
            ("tedas", "TEDAŞ KIRILIM"),
            ("marka", "MARKA"),
            ("flag", "FLAG"),
            ("model", "MODEL"),
            ("modelkodu", "MODEL KODU"),
        ]

        for key, label in product_fields:
            label_widget = QLabel(label)
            label_widget.setObjectName("subtitle")
            label_widget.setFont(QFont("Inter", 11))
            product_layout.addWidget(label_widget)

            input_field = QLineEdit()
            input_field.setPlaceholderText(f"{label} gir...")
            input_field.setMinimumHeight(32)
            input_field.textChanged.connect(self.on_input_changed)
            self.fields[key] = input_field
            product_layout.addWidget(input_field)

        layout.addWidget(product_group)

        layout.addSpacing(8)

        # Generate button
        generate_btn = QPushButton("✓ QR KOD OLUŞTUR")
        generate_btn.setMinimumHeight(44)
        generate_btn.setFont(QFont("Inter", 13, QFont.Weight.Bold))
        generate_btn.clicked.connect(self.on_generate_qr)
        layout.addWidget(generate_btn)

        layout.addStretch()

        # Quick actions
        quick_label = QLabel("HIZLI İŞLEMLER")
        quick_label.setObjectName("subtitle")
        layout.addWidget(quick_label)

        quick_layout = QHBoxLayout()
        quick_actions = [
            ("📋 Klipboard", "clipboard"),
            ("🔗 URL", "url"),
            ("📞 Telefon", "phone"),
            ("📧 Email", "email"),
        ]

        for label, action_id in quick_actions:
            btn = QPushButton(label)
            btn.setObjectName("secondaryBtn")
            btn.setMaximumWidth(100)
            btn.setMinimumHeight(28)
            btn.setFont(QFont("Inter", 10))
            btn.clicked.connect(lambda checked, a=action_id: self.quick_action(a))
            quick_layout.addWidget(btn)

        quick_layout.addStretch()
        layout.addLayout(quick_layout)

        return frame

    def create_preview_zone(self):
        """Create right preview panel."""
        frame = QFrame()
        frame.setObjectName("previewFrame")
        layout = QVBoxLayout(frame)
        layout.setContentsMargins(20, 20, 20, 20)
        layout.setSpacing(12)

        # Title
        title = QLabel("QR KOD ÖNİZLEMESİ")
        title.setObjectName("title")
        title.setFont(QFont("Inter", 16, QFont.Weight.Bold))
        layout.addWidget(title)

        # Preview image
        self.preview_label = QLabel()
        self.preview_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.preview_label.setStyleSheet(
            "background-color: #FFFFFF; border-radius: 8px; min-height: 300px;"
        )
        self.preview_label.setText("QR Kod görüntülenecek")
        self.preview_label.setStyleSheet("""
            QLabel {
                background-color: #FFFFFF;
                border: 1px solid #E2E8F0;
                border-radius: 8px;
                min-height: 300px;
                color: #64748B;
                font-size: 12px;
            }
        """)
        layout.addWidget(self.preview_label)

        # Status bar
        status_layout = QHBoxLayout()
        self.status_label = QLabel("Veri giriniz")
        self.status_label.setObjectName("statusLabel")
        status_layout.addWidget(self.status_label)

        size_label = QLabel("")
        size_label.setObjectName("subtitle")
        self.size_label = size_label
        status_layout.addWidget(size_label)
        status_layout.addStretch()

        layout.addLayout(status_layout)

        # Controls
        controls_layout = QHBoxLayout()

        zoom_btn = QPushButton("🔍 Zoom")
        zoom_btn.setObjectName("secondaryBtn")
        zoom_btn.setMaximumWidth(100)
        controls_layout.addWidget(zoom_btn)

        export_btn = QPushButton("⬇️ İndir DXF")
        export_btn.setMaximumWidth(100)
        export_btn.clicked.connect(self.on_export_dxf)
        controls_layout.addWidget(export_btn)

        controls_layout.addStretch()
        layout.addLayout(controls_layout)

        return frame

    def create_settings_bar(self):
        """Create bottom settings bar."""
        frame = QFrame()
        frame.setObjectName("settingsFrame")
        frame.setMaximumHeight(70)
        layout = QHBoxLayout(frame)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(20)

        # Error correction
        error_label = QLabel("HATA DÜZELTME:")
        error_label.setObjectName("subtitle")
        layout.addWidget(error_label)

        self.error_combo = QComboBox()
        self.error_combo.addItems(["L (Düşük %7)", "M (Orta %15)", "Q (Yüksek %25)", "H (Çok Yüksek %30)"])
        self.error_combo.setCurrentIndex(0)
        self.error_combo.setMaximumWidth(200)
        self.error_combo.currentTextChanged.connect(self.on_input_changed)
        layout.addWidget(self.error_combo)

        # Size
        size_label = QLabel("BOYUT (MM):")
        size_label.setObjectName("subtitle")
        layout.addWidget(size_label)

        self.size_spin = QSpinBox()
        self.size_spin.setMinimum(5)
        self.size_spin.setMaximum(200)
        self.size_spin.setValue(20)
        self.size_spin.setMaximumWidth(80)
        self.size_spin.valueChanged.connect(self.on_input_changed)
        layout.addWidget(self.size_spin)

        # Format (DXF only)
        format_label = QLabel("FORMAT:")
        format_label.setObjectName("subtitle")
        layout.addWidget(format_label)

        format_combo = QComboBox()
        format_combo.addItem("DXF (CAD)")
        format_combo.setMaximumWidth(120)
        format_combo.setEnabled(False)
        layout.addWidget(format_combo)

        layout.addStretch()

        # Advanced button
        advanced_btn = QPushButton("⚙️ ADVANCED")
        advanced_btn.setObjectName("secondaryBtn")
        advanced_btn.setMaximumWidth(120)
        layout.addWidget(advanced_btn)

        return frame

    def on_input_changed(self):
        """Handle input field changes for real-time preview."""
        try:
            data = self.build_qr_data()
            if data:
                error_correction = self.error_combo.currentText().split()[0]
                img = self.qr_gen.generate(data, error_correction=error_correction, border=2)

                # Convert PIL to QPixmap
                qr_size = 260
                pil_img = img.resize((qr_size, qr_size))
                pixmap = QPixmap(qr_size, qr_size)

                # Convert to RGB
                rgb_img = pil_img.convert("RGB")
                data = rgb_img.tobytes("raw", "RGB")
                pixmap = QPixmap.fromImage(
                    QPixmap(qr_size, qr_size).toImage()
                )

                # Use simpler approach - save and reload
                import tempfile
                import os
                with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
                    rgb_img.save(tmp.name)
                    pixmap = QPixmap(tmp.name)
                    os.unlink(tmp.name)

                self.preview_label.setPixmap(pixmap.scaledToWidth(260, Qt.TransformationMode.SmoothTransformation))

                # Update status
                self.status_label.setText("✓ Geçerli")
                self.status_label.setStyleSheet("color: #10B981; font-weight: 600;")

                info = self.dxf_exp.get_info(self.qr_gen.get_pil_image())
                self.size_label.setText(f"• Boyut: {info['size']}")

        except Exception as e:
            self.preview_label.setText("❌ Hata")
            self.status_label.setText("Hata oluştu")
            self.status_label.setStyleSheet("color: #EF4444; font-weight: 600;")

    def build_qr_data(self):
        """Build QR data from input fields."""
        vals = [self.fields[k].text().upper() for k in self.fields.keys()]
        if not all(vals):
            return None

        karekodno, tedas, marka, flag, model, modelkodu, serino, imaltarihi = vals
        serino = ''.join(c for c in serino if c.isalnum()).zfill(9)
        imaltarihi = imaltarihi[-2:] if len(imaltarihi) == 4 else imaltarihi.zfill(2)

        qr_text = (
            f"||KAREKODNO_{karekodno}|TEDASKIRILIM_{tedas}|MARKA_{marka}|"
            f"FLAG_{flag}|MODEL_{model}|MODELKODU_{modelkodu}|"
            f"SERINO_{serino}|IMALTARIHI_{imaltarihi}||"
        )
        return qr_text

    def on_generate_qr(self):
        """Generate QR code (already in preview, just confirm export)."""
        QMessageBox.information(self, "Başarılı", "QR kod hazır! İndir butonuna basın.")

    def on_export_dxf(self):
        """Export QR code to DXF."""
        data = self.build_qr_data()
        if not data:
            QMessageBox.warning(self, "Hata", "Tüm alanları doldurun!")
            return

        try:
            img = self.qr_gen.get_pil_image()
            if not img:
                QMessageBox.warning(self, "Hata", "Önce QR kod oluşturun!")
                return

            serino = self.fields["serino"].text()
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"QR_{serino}_{timestamp}.dxf"

            filepath, _ = QFileDialog.getSaveFileName(
                self,
                "Dosyayı Kaydet",
                filename,
                "DXF Dosyaları (*.dxf)"
            )

            if filepath:
                self.dxf_exp.create_document()
                self.dxf_exp.export_qr(img, size_mm=self.size_spin.value())
                self.dxf_exp.save(filepath)
                QMessageBox.information(self, "Başarılı", f"DXF dosyası kaydedildi:\n{filepath}")

        except Exception as e:
            QMessageBox.critical(self, "Hata", f"Dosya kaydedilemedi:\n{str(e)}")

    def on_preview_update(self, pixmap):
        """Handle preview update signal."""
        self.preview_label.setPixmap(pixmap)

    def quick_action(self, action_id):
        """Handle quick action buttons."""
        if action_id == "clipboard":
            import pyperclip
            try:
                text = pyperclip.paste()
                self.fields["karekodno"].setText(text)
            except:
                QMessageBox.warning(self, "Hata", "Clipboard okunamadı!")
        elif action_id == "url":
            self.fields["karekodno"].setText("https://example.com")
        elif action_id == "phone":
            self.fields["karekodno"].setText("+90555")
        elif action_id == "email":
            self.fields["karekodno"].setText("info@example.com")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = QRCreatorApp()
    sys.exit(app.exec())
