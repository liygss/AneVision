# AneVision

Skrining awal risiko anemia melalui analisis citra mata (konjungtiva) dan kuku, tanpa pengambilan darah. Estimasi hemoglobin dan klasifikasi risiko berjalan di browser.

> **Bukan alat diagnosis.** Hasil ini adalah alat skrining dan harus dikonfirmasi dengan uji hemoglobin laboratorium serta evaluasi tenaga kesehatan profesional.

## Cara menjalankan

Butuh dua virtualenv Python karena ada konflik versi protobuf: TensorFlow (model mata) butuh protobuf ≥ 6, sedangkan mediapipe (deteksi kuku) butuh protobuf 4. Keduanya tidak bisa hidup di satu proses, jadi inferensi kuku jalan di subprocess terpisah.

```bash
# Backend (venv utama: TensorFlow + scikit-learn)
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# Backend (venv kuku: ultralytics/PyTorch + mediapipe + onnxruntime)
python3 -m venv .venv_nail
./.venv_nail/bin/pip install -r requirements_nail.txt

# Frontend
cd ../frontend && npm install
```

Kemudian jalankan keduanya:

```bash
./start.sh
```

| | |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 (`GET /health`, `POST /predict`) |

Backend berjalan dengan `MODEL_MODE=real` agar model dimuat sungguhan, bukan mock. Vite mem-proxy `/api` ke backend, jadi tidak perlu konfigurasi CORS.

## Arsitektur

```
frontend/   React 19 + TypeScript + Vite + Tailwind CSS 4 + framer-motion
backend/    FastAPI + scikit-learn + TensorFlow + PyTorch(ultralytics) + ONNX Runtime
```

### Model

| Peran | Framework | Model | Error |
|---|---|---|---|
| Estimasi Hb dari citra mata | scikit-learn | Ridge Regression atas 13 fitur warna (Lab/HSV/RGB) | MAE ±1.30 g/dL |
| Validasi status mata | TensorFlow / Keras | MobileNetV2 **frozen** (ImageNet) + LogisticRegression | akurasi 0.734, recall 0.800 |
| Deteksi & segmentasi kuku | PyTorch (ultralytics) | YOLO26-seg | mAP50 0.965, Dice 0.847 |
| Estimasi Hb dari kuku | scikit-learn | RobustScaler + ElasticNet atas 42 fitur persentil RGB | MAE ±1.60 g/dL |
| Penyesuaian kondisi kuku | ONNX Runtime | ResNet18 2 tahap (opsional, degrade aman) | - |
| Fusi hasil | numpy | rata-rata berbobot inverse-MAE (mata 0.552 : kuku 0.448) | - |

Angka Hb sendiri dihasilkan oleh regresi klasik, bukan deep learning. MobileNetV2 diperlakukan sebagai feature extractor beku dan hanya jadi validator, sedangkan YOLO hanya berguna untuk memotong area kuku. Ini keputusan sadar, bukan keterbatasan: pada 211 citra mata, model besar cenderung overfit.

Ambang anemia mengikuti WHO: wanita < 12.0 g/dL, pria < 13.0 g/dL. Jenis kelamin wajib diisi pengguna dan tidak pernah ditebak sistem, karena `is_female` adalah salah satu fitur input Ridge.

### Keterbatasan yang perlu diketahui

- MAE ±1.3 sampai ±1.6 g/dL. Rentang estimasi dan tingkat keyakinan ditampilkan karena itu, tapi keyakinan model **sengaja** dibatasi maksimum 0.85 supaya tidak pernah menampilkan "100% yakin" atas estimasi yang rentang errornya segitu lebar.
- Dataset mata hanya 211 citra (5-fold cross-validation). Dataset kuku 250 foto (held-out: MAE 1.49 g/dL, AUC 0.864).
- Prediksi sensitif terhadap pencahayaan, kualitas kamera, pigmen kulit, sudut, dan ketajaman gambar.
- Tidak ada variant threshold untuk ibu hamil; protokol mengoleksi metadata kehamilan tetapi belum diimplementasikan.

## Privasi

Foto dikirim ke endpoint `/predict` dan diproses di memori. Tidak ada penulisan citra ke disk di jalur request mana pun, dan tidak ada profil pengguna yang tersimpan. Kredensial model kuku diproses lewat subprocess over stdin/stdout, tidak pernah ditulis ke file.

## Struktur repo

`backend/models/` berisi tiga repo pihak ketiga yang di-*vendor* (folder `.git` di dalamnya dihapus agar repo ini tetap satu repo utuh; history ada di upstream masing-masing):

| Direktori | Upstream |
|---|---|
| `Deploy_AnemiaEyes` | https://github.com/Madeysszz/Deploy_AnemiaEyes |
| `Kuku-Anemia` | https://github.com/Dani461-dev/Kuku-Anemia |
| `AINailSys` | https://github.com/leyowi/ainailsys |

Bobot model runtime ikut di-commit agar backend bisa langsung jalan setelah clone. Checkpoint eksperimen riset dan AINailSys ONNX dikecualikan lewat `.gitignore` karena tidak dipakai inferensi (AINailSys ONNX dijaga `try/except` di `backend/services/nail_worker.py`).
