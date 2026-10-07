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
| Estimasi Hb dari kuku | ONNX Runtime | **CNN ResNet18 v2** (crop kuku, colornorm whitep98 + TTA) | MAE ±1.36 g/dL |
| Penyesuaian kondisi kuku | ONNX Runtime | ResNet18 2 tahap (opsional, degrade aman) | - |
| Fusi hasil | numpy | rata-rata berbobot inverse-MAE (mata 0.671 : kuku 0.329) | - |

Hb dari mata tetap regresi klasik (Ridge) — pada 211 citra mata, model besar cenderung overfit; Hb dari kuku kini CNN ResNet18 (ONNX, domain dataset sewa 5.782 pasien) dengan fallback ElasticNet 42-fitur bila ONNX gagal dimuat. MobileNetV2 diperlakukan sebagai feature extractor beku dan hanya jadi validator, sedangkan YOLO berguna untuk memotong area kuku.

Ambang anemia mengikuti WHO: wanita < 12.0 g/dL, pria < 13.0 g/dL. Jenis kelamin wajib diisi pengguna dan tidak pernah ditebak sistem, karena `is_female` adalah salah satu fitur input Ridge.

### Keterbatasan yang perlu diketahui

- MAE ±1.3 sampai ±1.4 g/dL. Rentang estimasi dan tingkat keyakinan ditampilkan karena itu, tapi keyakinan model **sengaja** dibatasi maksimum 0.85 supaya tidak pernah menampilkan "100% yakin" atas estimasi yang rentang errornya segitu lebar.
- Dataset mata hanya 211 citra (5-fold cross-validation). CNN kuku dilatih dari dataset sewa (5.782 pasien, test MAE 1.36 g/dL per pasien); foto free-bg bergaya MSU adalah domain berbeda — eksperimen mencatat degradasi lintas-domain, jadi hasil kuku tetap wajib dikonfirmasi dengan lab.
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

Vercel mendukung banyak service dalam satu proyek lewat blok `services` di
`vercel.json`:

| Service | Root | Isi |
|---|---|---|
| `frontend` | `frontend/` | Vite → static hosting |
| `backend` | `backend/` | FastAPI sebagai serverless function |

Routing: `/api/*` dilepas ke service `backend`, sisanya dilayani `frontend`
sebagai SPA. Karena rewrite di root memakai path `/api`, frontend dan backend
berpindah domain **tidak** perlu konfigurasi CORS tambahan.

### Prefix `/api` tidak dilepas

Vercel Services meneruskan **path asli** ke service, tidak memotong prefix:

> The service receives the original request path. `GET /api/users` reaches
> `my_backend` as `/api/users`, not `/users`.

Jadi `GET /api/health` sampai di FastAPI sebagai `/api/health`, bukan `/health`.
Karena itu router dipasang dua kali di `backend/main.py`:

```python
app.include_router(router)                 # /health, /predict
app.include_router(router, prefix="/api")   # /api/health, /api/predict
```

Tanpa baris kedua, backend akan menjawab `404 Not Found` untuk panggilan
frontend. Memasang dua kali membuat kedua penulisan valid, sehingga backend juga
tetap bisa diuji langsung lewat `uvicorn` atau `curl` tanpa lewat proxy.

### Bagian yang wajib diisi: `entrypoint`

Dalam mode services, Vercel **tidak** lagi menebak file aplikasi Python. obliga
ditulis eksplisit di dalam objek service:

```json
"backend": {
  "root": "backend",
  "framework": "fastapi",
  "entrypoint": "main:app"
}
```

Tanpa itu build berhenti dengan:

```
Service "backend" detected framework "fastapi" in "backend" and must specify
an "entrypoint" for runtime "python".
```

`main:app` berarti cari objek `app` di `backend/main.py`. Nilai ini dibaca
terhadap service root, dan bentuknya `module:attr`.

> `[tool.vercel] entrypoint` di `pyproject.toml` **tidak berlaku** pada mode
> services. Nilai itu hanya dibaca untuk proyek Python tunggal. Karena itu
> `backend/pyproject.toml` tidak lagi dipakai di sini.

### Syarat di dashboard Vercel

Project hanya dibangun sebagai services bila **dua hal** ini benar:

1. Framework preset proyek disetel ke **Services**.
2. `vercel.json` di root memuat key `services`.

Kalau salah satu tidak ada, Vercel memakai deteksi framework default dan
mengabaikan konfigurasi services.

### Environment variable

| Key | Scope | Value | Keterangan |
|---|---|---|---|
| `VERCEL_SUPPORT_LARGE_FUNCTIONS` | project | `1` | **Wajib.** Menaikkan batas bundle function dari 500 MB ke 5 GB. Tanpa ini, dependensi model kuku (torch + ultralytics + mediapipe) tidak muat dan build gagal. |
| `MODEL_MODE` | backend | `real` | **Wajib.** Default-nya `mock` membuat backend tidak memuat model dan `/predict` selalu menolak dengan "Eye model not loaded". |
| `VITE_API_BASE_URL` | frontend | *(kosongkan)* | Biarkan kosong agar frontend memakai rewrite `/api` yang sama-origin. |

### Langkah deploy

1. <https://vercel.com/new> → **Add New → Project** → import `liygss/AneVision`.
2. **Root Directory**: biarkan kosong (repo root), karena kedua service ada di dalam `vercel.json`.
3. **Framework Preset**: **Services**.
4. Tambahkan ketiga environment variable di atas.
5. Deploy. Cek `https://<proyek>.vercel.app/api/health` harus membalas `{"status":"ok"}`, dan `https://<proyek>.vercel.app/` harus memuat landing page.

### Batasan yang perlu diketahui

Aplikasi FastAPI di Vercel menjadi satu function. Batas bundle standarnya
500 MB, dan **Large Functions** (beta) menaikkan itu menjadi 5 GB. Paket Hobby
menyediakan RAM 2 GB, yang cukup untuk kedua model sekaligus karena keduanya
berjalan pada dua proses terpisah.

Kebutuhan memori terukur di mesin lokal:

| Jalur | Isi | Peak RSS |
|---|---|---|
| Mata | numpy, opencv, scikit-learn, TensorFlow, MobileNetV2 | **548 MB** |
| Kuku | torch, mediapipe, ultralytics, YOLO26-seg | **466 MB** |
| | **Total dua proses** | **≈ 1,0 GB** dari 2 GB |

Karena itu `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` wajib dipasang, dan `maxDuration`
diatur 300 detik (`services/nail.py` sendiri menunggu 90 detik untuk worker).

### Dua virtualenv, dan bagaimana Vercel menanganinya

Secara lokal, kuku memakai virtualenv kedua (`.venv_nail`) karena ada konflik
protobuf: mediapipe 0.10.x butuh protobuf 4.x, sedangkan TensorFlow butuh
protobuf ≥ 6.31.1. Keduanya tidak bisa hidup di satu proses, jadi inferensi kuku
dijalankan sebagai subprocess.

Serverless seperti Vercel hanya menyediakan satu interpreter, jadi
`.venv_nail` tidak ada. `services/nail.py` mendeteksinya dan mengimpor worker
langsung ke dalam proses berjalan sebagai gantinya. Jalur kuku tetap berfungsi,
dan lock `threading.Lock` tetap berlaku di kedua jalur.

### Batas yang tidak hilang

- Jalur kuku butuh RAM ~2 GB kalau dua model dimuat dalam **satu** proses.
  Di Vercel keduanya terpisah, jadi aman; di host dengan RAM kecil, model
  kuku akan gagal dimuat dan endpoint otomatis turun ke mode mata-saja
  (`services/nail.py` mengembalikan pesan bersih, bukan crash).
- Bobot model yang dipakai runtime terdaftar di
  [`backend/models/RUNTIME_MODELS.md`](backend/models/RUNTIME_MODELS.md)
  beserta checksum-nya. Dataset training dan checkpoint riset sengaja tidak
  disertakan.

### Kalau backend tidak di-deploy

Situs `frontend` tetap utuh: beranda, `/demo`, dan `/about` berfungsi penuh, dan
`/demo` berjalan sepenuhnya di browser tanpa memanggil API. Halaman
`/screening` mendeteksi backend yang tidak ada lalu menampilkan pemberitahuan
alihalih gagal diam-diam, karena server statis menjawab `/api/*` dengan
`index.html` berstatus 200. Pemeriksaan konektivitas memverifikasi
`content-type` sehingga kondisi itu tidak dianggap sebagai "server online".

### Verifikasi lokal

```bash
./start.sh
curl http://localhost:8000/health
```
