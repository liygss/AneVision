# AneVision

Skrining awal risiko anemia melalui analisis citra mata (konjungtiva) dan kuku, tanpa pengambilan darah. Estimasi hemoglobin dan klasifikasi risiko berjalan di browser.

> **Bukan alat diagnosis.** Hasil ini adalah alat skrining dan harus dikonfirmasi dengan uji hemoglobin laboratorium serta evaluasi tenaga kesehatan profesional.

## Cara menjalankan

Butuh dua virtualenv Python karena ada konflik versi protobuf: TensorFlow (validator CNN) butuh protobuf ≥ 6, sedangkan mediapipe (deteksi kuku) butuh protobuf 4. Keduanya tidak bisa hidup di satu proses, jadi inferensi kuku jalan di subprocess terpisah.

```bash
# Backend (venv utama)
cd backend
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt

# Opsional: validator MobileNetV2 butuh TensorFlow (1.1 GB). Angka Hb tetap
# sama persis tanpanya, hanya validator kedua yang tidak ada.
./.venv/bin/pip install -r requirements-eyeml.txt

# Backend (venv kuku: ultralytics/PyTorch + mediapipe + onnxruntime)
python3 -m venv .venv_nail
./.venv_nail/bin/pip install -r requirements_nail.txt

# Frontend
cd ../frontend && npm install
```

Tanpa `requirements-eyeml.txt` dan `requirements_nail.txt`, backend tetap jalan dan menampilkan estimasi Hb dari model mata saja. Yang hilang adalah validator kedua dan deteksi kuku.

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
| `backend` | `backend/` | FastAPI sebagai serverless function, entrypoint `backend/main.py` (dinyatakan di `backend/pyproject.toml`) |

Routing: `/api/*` dilepas ke service `backend`, sisanya dilayani `frontend` sebagai SPA.

### Batasan yang perlu diketahui sebelum deploy

Aplikasi FastAPI di Vercel menjadi satu function dengan batas bundle **500 MB**. Setelah diukur, isi bundle yang akan terpaket:

| Dependency | Ukuran terpasang | Dampak |
|---|---|---|
| `tensorflow` | **1.1 GB** | Melewati batas 500 MB, harus dibuang |
| `opencv-python-headless` | 119 MB | Wajib untuk ekstraksi fitur Lab/HSV |
| `scipy` (ikut `scikit-learn`) | 81 MB | Wajib |
| numpy + sklearn + Pillow + joblib + FastAPI | ~100 MB | Wajib |
| **Total jalur mata saja** | **≈ 300 MB** | **Muat di bawah batas 500 MB** |

Karena itu backend tidak punya daftar dependency khusus Vercel. `backend/requirements.txt` sudah merupakan daftar yang aman untuk Vercel, jadi deploy manual tidak perlu menukar file apa pun:

| File | Isi | Dipakai |
|---|---|---|
| `backend/requirements.txt` | numpy, opencv, scikit-learn, FastAPI | Vercel **dan** lokal |
| `backend/requirements-eyeml.txt` | `tensorflow` saja | opsional, hanya lokal |
| `backend/requirements_nail.txt` | ultralytics, mediapipe, onnxruntime | lokal saja, venv terpisah |

Yang hilang saat TensorFlow tidak dipasang adalah **validator status MobileNetV2**, bukan angkanya. Angka Hb tetap dihasilkan Ridge Regression, dan keduanya terbukti identik: `hgb_predicted 13.72` dengan maupun tanpa TensorFlow, hanya `source` berubah dari `ensemble_Ridge+MobileNetV2` menjadi `Ridge_only`. Kode sudah aman untuk itu di `models/Deploy_AnemiaEyes/deploy/inference.py:82-84`.

Jalur kuku **tidak bisa jalan di Vercel** karena butuh PyTorch di virtualenv terpisah dan serverless function tidak bisa membuat subprocess tersebut. `services/nail.py:28` sudah mendeteksi ketiadaan venv dan mengembalikan pesan bersih, jadi endpoint otomatis turun ke mode mata-saja, bukan crash.

### Entry point

Vercel mencari instance `FastAPI` bernama `app` di `app.py`, `index.py`, `server.py`, `main.py`, `wsgi.py`, atau `asgi.py` pada root service, dan di `src/` atau `app/`. Aplikasi ini berada di `backend/main.py`. Supaya tidak ambigu, entrypoint-nya dinyatakan eksplisit di `backend/pyproject.toml`:

```toml
[tool.vercel]
entrypoint = "main:app"
```

Tanpa itu Vercel berhenti dengan:
`Detected framework "fastapi" in "backend" and must specify an "entrypoint" for runtime "python".`

### Deploy manual lewat dashboard Vercel

1. Buka <https://vercel.com/new> → **Add New → Project** → import repo `liygss/AneVision`.
2. **Root Directory** biarkan kosong (repo root). Vercel membaca `vercel.json` dan
   membuat sendiri service `frontend` dan `backend` dari sana.
3. Framework Preset: **Other**. Biarkan Build Command, Output Directory, dan
   Install Command kosong, semuanya sudah dideteksi dari `vercel.json`.
4. Tambahkan environment variable di bawah, lalu Deploy.

| Key | Service | Value | Keterangan |
|---|---|---|---|
| `MODEL_MODE` | backend | `real` | **Wajib.** Default-nya `mock`, membuat backend tidak memuat model dan `/predict` selalu menolak dengan "Eye model not loaded". |
| `FRONTEND_URL` | backend | `https://<nama-proyek>.vercel.app` | Backend mengizinkan CORS hanya untuk nilai ini (`backend/main.py:27-33`). |
| `VITE_API_BASE_URL` | frontend | *(kosongkan)* | Biarkan kosong agar frontend memakai rewrite `/api` yang sama-origin. |

> Service `backend` memakai Fluid compute dan bundle-nya sekitar 300 MB, masih di
> bawah batas 500 MB, jadi tidak memerlukan paket Pro.

### Kalau backend tidak di-deploy

Hapus service `backend` dari `vercel.json` sebelum deploy. Beranda, `/demo`, dan
`/about` tetap utuh, dan `/demo` berjalan penuh di browser tanpa memanggil API.
Halaman `/screening` mendeteksi backend yang tidak ada dan menampilkan
pemberitahuan alih-alih gagal diam-diam, karena static host menjawab `/api/*`
dengan `index.html` berstatus 200. Pemeriksaan konektivitas memverifikasi
`content-type` sehingga kondisi itu tidak dianggap sebagai "server online".

