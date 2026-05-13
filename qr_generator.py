import qrcode
from qrcode.image.pure import PyPNGImage
from PIL import Image
import io

class QRGenerator:
    def __init__(self):
        self.qr = None
        self.img = None
        self.last_data = None
        self.last_error_correction = None

    def generate(self, data, error_correction='L', border=4):
        """Generate QR code with specified parameters."""
        if data == self.last_data and error_correction == self.last_error_correction and self.qr:
            return self.img

        error_map = {
            'L': qrcode.constants.ERROR_CORRECT_L,
            'M': qrcode.constants.ERROR_CORRECT_M,
            'Q': qrcode.constants.ERROR_CORRECT_Q,
            'H': qrcode.constants.ERROR_CORRECT_H,
        }

        self.qr = qrcode.QRCode(
            version=None,
            error_correction=error_map.get(error_correction, qrcode.constants.ERROR_CORRECT_L),
            box_size=1,
            border=border,
        )
        self.qr.add_data(data)
        self.qr.make(fit=True)

        self.img = self.qr.make_image(fill_color="black", back_color="white")
        self.last_data = data
        self.last_error_correction = error_correction
        return self.img

    def get_pil_image(self):
        """Return PIL Image object."""
        return self.img

    def get_modules_count(self):
        """Get QR modules count (for sizing)."""
        return self.qr.modules_count if self.qr else 0

    def get_version(self):
        """Get QR version."""
        return self.qr.version if self.qr else None
