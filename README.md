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

## Deployment

Repo ini dikonfigurasi untuk Vercel lewat `vercel.json` di root, memakai dua service dalam satu proyek:

| Service | Root | Isi |
|---|---|---|
| `frontend` | `frontend/` | Vite → static hosting |
| `backend` | `backend/` | FastAPI sebagai serverless function, entrypoint di `backend/api/index.py` |

Routing: `/api/*` dilepas ke service `backend`, sisanya dilayani `frontend` sebagai SPA.

### Batasan yang perlu diketahui sebelum deploy

Vercel membatasi ukuran satu serverless function di **250 MB (Hobby) / 1000 MB (Pro)**. Setelah diukur:

| Dependency | Ukuran terpasang | Dampak |
|---|---|---|
| `tensorflow` | **1.1 GB** | Melebihi bahkan batas Pro, harus dibuang |
| `opencv-python-headless` | 119 MB | Wajib untuk ekstraksi fitur Lab/HSV |
| `scipy` (ikut `scikit-learn`) | 81 MB | Wajib |
| numpy + sklearn + Pillow + joblib | 76 MB | Wajib |
| **Total jalur mata saja** | **≈ 276 MB** | Butuh paket **Pro** |

Karena itu backend punya dua daftar dependency:

- `backend/requirements.txt` — pengembangan lokal, memuat TensorFlow untuk validator MobileNetV2.
- `backend/requirements-vercel.txt` — untuk deploy, tanpa TensorFlow.

Untuk deploy backend ke Vercel, ganti `requirements.txt` dengan `requirements-vercel.txt`.

Yang hilang saat TensorFlow dibuang adalah **validator status MobileNetV2**, bukan angkanya. Angka Hb tetap dihasilkan Ridge Regression, dan keduanya terbukti identik: `hgb_predicted 13.72` dengan maupun tanpa TensorFlow, hanya `source` berubah dari `ensemble_Ridge+MobileNetV2` menjadi `Ridge_only`. Kode sudah aman untuk itu di `models/Deploy_AnemiaEyes/deploy/inference.py:82-84`.

Jalur kuku **tidak bisa jalan di Vercel** karena butuh PyTorch di virtualenv terpisah dan serverless function tidak bisa membuat subprocess tersebut. `services/nail.py:28` sudah mendeteksi ketiadaan venv dan mengembalikan pesan bersih, jadi endpoint otomatis turun ke mode mata-saja, bukan crash.

### Kalau backend tidak di-deploy

Halaman beranda, `/demo`, dan `/about` tetap berfungsi penuh. `/demo` berjalan sepenuhnya di browser tanpa memanggil API. Halaman `/screening` mendeteksi backend yang tidak ada dan menampilkan pemberitahuan alih-alih gagal diam-diam, karena static host seperti Vercel menjawab `/api/*` dengan `index.html` berstatus 200. Pemeriksaan konektivitas memverifikasi `content-type` sehingga kondisi tersebut tidak dianggap sebagai "server online".

### Environment variable

| Service | Variable | Nilai |
|---|---|---|
| backend | `MODEL_MODE` | `mock` (default, model tidak dimuat) |
| backend | `FRONTEND_URL` | URL Vercel untuk CORS, mis. `https://anevision.vercel.app` |
| frontend | `VITE_API_BASE_URL` | biarkan kosong untuk memakai rewrite `/api` yang sama-origin |

CORS backend sudah accepting `FRONTEND_URL` (`backend/main.py:27-33`).

