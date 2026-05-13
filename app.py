from flask import Flask, render_template, request, send_file, jsonify
from qr_generator import QRGenerator
from dxf_exporter import DXFExporter
from datetime import datetime
import io
import base64
import os
import tempfile

app = Flask(__name__)
qr_gen = QRGenerator()
dxf_exp = DXFExporter()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/preview', methods=['POST'])
def preview():
    try:
        data = request.json
        customtext = data.get('customtext', '').strip()

        vals = {
            'karekodno': data.get('karekodno', '').upper(),
            'tedas': data.get('tedas', '').upper(),
            'marka': data.get('marka', '').upper(),
            'flag': data.get('flag', '').upper(),
            'model': data.get('model', '').upper(),
            'modelkodu': data.get('modelkodu', '').upper(),
            'serino': data.get('serino', '').upper(),
            'imaltarihi': data.get('imaltarihi', '').upper(),
        }

        # Eğer sadece custom text varsa, diğer alanları doldurmaya gerek yok
        if customtext and not all(vals.values()):
            qr_text = customtext
        elif all(vals.values()):
            # TEDAŞ QR KOD alanları dolduysa
            vals['serino'] = ''.join(c for c in vals['serino'] if c.isalnum()).zfill(9)
            vals['imaltarihi'] = vals['imaltarihi'][-2:] if len(vals['imaltarihi']) == 4 else vals['imaltarihi'].zfill(2)

            qr_text = (
                f"||KAREKODNO_{vals['karekodno']}|TEDASKIRILIM_{vals['tedas']}|MARKA_{vals['marka']}|"
                f"FLAG_{vals['flag']}|MODEL_{vals['model']}|MODELKODU_{vals['modelkodu']}|"
                f"SERINO_{vals['serino']}|IMALTARIHI_{vals['imaltarihi']}||"
            )

            # Özel metin ekle (varsa)
            if customtext:
                qr_text += f"|OZELMETIN_{customtext}|"
        else:
            return jsonify({'error': 'Veri giriniz'}), 400

        if not qr_text:
            return jsonify({'error': 'Veri giriniz'}), 400


        # Generate
        error_level = data.get('error_level', 'L')
        img = qr_gen.generate(qr_text, error_correction=error_level, border=2)

        # To Base64
        from PIL import Image as PILImage
        img_resized = img.resize((280, 280), PILImage.Resampling.NEAREST)
        buffer = io.BytesIO()
        img_resized.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        info = dxf_exp.get_info(img)

        return jsonify({
            'image': f'data:image/png;base64,{img_base64}',
            'size': info['size']
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export-png', methods=['POST'])
def export_png():
    try:
        data = request.json
        customtext = data.get('customtext', '').strip()

        vals = {
            'karekodno': data.get('karekodno', '').upper(),
            'tedas': data.get('tedas', '').upper(),
            'marka': data.get('marka', '').upper(),
            'flag': data.get('flag', '').upper(),
            'model': data.get('model', '').upper(),
            'modelkodu': data.get('modelkodu', '').upper(),
            'serino': data.get('serino', '').upper(),
            'imaltarihi': data.get('imaltarihi', '').upper(),
        }

        # Eğer sadece custom text varsa
        if customtext and not all(vals.values()):
            qr_text = customtext
        elif all(vals.values()):
            vals['serino'] = ''.join(c for c in vals['serino'] if c.isalnum()).zfill(9)
            vals['imaltarihi'] = vals['imaltarihi'][-2:] if len(vals['imaltarihi']) == 4 else vals['imaltarihi'].zfill(2)

            qr_text = (
                f"||KAREKODNO_{vals['karekodno']}|TEDASKIRILIM_{vals['tedas']}|MARKA_{vals['marka']}|"
                f"FLAG_{vals['flag']}|MODEL_{vals['model']}|MODELKODU_{vals['modelkodu']}|"
                f"SERINO_{vals['serino']}|IMALTARIHI_{vals['imaltarihi']}||"
            )

            if customtext:
                qr_text += f"|OZELMETIN_{customtext}|"
        else:
            return jsonify({'error': 'Veri giriniz'}), 400

        error_level = data.get('error_level', 'L')
        img = qr_gen.generate(qr_text, error_correction=error_level, border=2)

        # Scale up PNG for better quality (10x magnification)
        from PIL import Image as PILImage
        scale = 10
        scaled_img = img.resize((img.size[0] * scale, img.size[1] * scale), PILImage.Resampling.NEAREST)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Dosya adını belirle
        if customtext and not all(vals.values()):
            filename = f"qr_{customtext}.png"
        else:
            filename = f"qr_{vals['karekodno']}.png"

        buffer = io.BytesIO()
        scaled_img.save(buffer, format='PNG')
        buffer.seek(0)

        return send_file(
            buffer,
            mimetype='image/png',
            as_attachment=True,
            download_name=filename
        )

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/export', methods=['POST'])
def export():
    try:
        data = request.json
        customtext = data.get('customtext', '').strip()

        vals = {
            'karekodno': data.get('karekodno', '').upper(),
            'tedas': data.get('tedas', '').upper(),
            'marka': data.get('marka', '').upper(),
            'flag': data.get('flag', '').upper(),
            'model': data.get('model', '').upper(),
            'modelkodu': data.get('modelkodu', '').upper(),
            'serino': data.get('serino', '').upper(),
            'imaltarihi': data.get('imaltarihi', '').upper(),
        }

        # Eğer sadece custom text varsa
        if customtext and not all(vals.values()):
            qr_text = customtext
        elif all(vals.values()):
            vals['serino'] = ''.join(c for c in vals['serino'] if c.isalnum()).zfill(9)
            vals['imaltarihi'] = vals['imaltarihi'][-2:] if len(vals['imaltarihi']) == 4 else vals['imaltarihi'].zfill(2)

            qr_text = (
                f"||KAREKODNO_{vals['karekodno']}|TEDASKIRILIM_{vals['tedas']}|MARKA_{vals['marka']}|"
                f"FLAG_{vals['flag']}|MODEL_{vals['model']}|MODELKODU_{vals['modelkodu']}|"
                f"SERINO_{vals['serino']}|IMALTARIHI_{vals['imaltarihi']}||"
            )

            if customtext:
                qr_text += f"|OZELMETIN_{customtext}|"
        else:
            return jsonify({'error': 'Veri giriniz'}), 400

        error_level = data.get('error_level', 'L')
        size_mm = int(data.get('size_mm', 20))

        img = qr_gen.generate(qr_text, error_correction=error_level, border=2)
        dxf_exp.create_document()
        dxf_exp.export_qr(img, size_mm=size_mm)

        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.dxf', delete=False) as tmp:
            tmp_path = tmp.name

        dxf_exp.save(tmp_path)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Dosya adını belirle
        if customtext and not all(vals.values()):
            filename = f"qr_{customtext}.dxf"
        else:
            filename = f"qr_{vals['karekodno']}.dxf"

        # Send file and delete it after
        def remove_file(response):
            try:
                os.unlink(tmp_path)
            except:
                pass
            return response

        response = send_file(
            tmp_path,
            as_attachment=True,
            download_name=filename,
            mimetype='application/dxf'
        )
        response.call_on_close(remove_file)
        return response

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5000)
