import ezdxf
from PIL import Image

class DXFExporter:
    def __init__(self):
        self.doc = None
        self.msp = None

    def create_document(self):
        """Create a new DXF document."""
        self.doc = ezdxf.new("R2010")
        self.msp = self.doc.modelspace()

    def export_qr(self, img, size_mm=20):
        """Export PIL Image to DXF format for laser engraving with hatch pattern.

        Args:
            img: PIL Image object
            size_mm: QR code size in mm
        """
        if not self.msp:
            self.create_document()

        pixels = list(img.getdata())
        w, h = img.size
        cell = size_mm / w

        for y in range(h):
            for x in range(w):
                pixel_index = y * w + x
                if pixels[pixel_index] == 0:  # Black pixels
                    x0 = x * cell
                    y0 = (h - 1 - y) * cell
                    x1 = x0 + cell
                    y1 = y0 + cell

                    # Draw filled rectangle as closed polyline with fill
                    points = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
                    lwpoly = self.msp.add_lwpolyline(points)
                    lwpoly.close(True)
                    lwpoly.dxf.color = 0  # Black
                    # Create hatch for this polyline
                    hatch = self.msp.add_hatch()
                    hatch.dxf.pattern_name = 'SOLID'
                    hatch.dxf.color = 0
                    hatch.paths.add_polyline_path(points, is_closed=True)

    def save(self, filepath):
        """Save DXF document to file."""
        if self.doc:
            self.doc.saveas(filepath)
            return True
        return False

    def get_info(self, img):
        """Get QR code information for display."""
        w, h = img.size
        return {
            'width': w,
            'height': h,
            'size': f"{w}x{h}",
            'pixels': w * h
        }
