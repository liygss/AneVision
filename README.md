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

Kemudian nyalakan backend + frontend sekaligus:

```bash
./start.sh
```

| | |
|---|---|
| Frontend | http://127.0.0.1:5173 |
| Backend | http://127.0.0.1:8000 (`GET /health`, `POST /predict`) |
| Publik (HP) | opsional: jalankan `./start.sh --ngrok`, lalu pakai URL `*.ngrok-free.dev` yang dicetak script |

Kalau port 5173/8000 sudah dipakai, script otomatis pindah ke port berikutnya
(5174/8001) dan tetap mencetak URL yang benar.

Opsi lain:

```bash
./start.sh --ngrok   # backend + frontend + tunnel publik ngrok
./start.sh --help    # daftar opsi
```

Backend berjalan dengan `MODEL_MODE=real` agar model dimuat sungguhan, bukan mock. Vite mem-proxy `/api` ke backend, jadi tidak perlu konfigurasi CORS.

### Tunnel ngrok

`./start.sh --ngrok` menjalankan ngrok (butuh authtoken, lihat
<https://dashboard.ngrok.com/get-started/your-authtoken>) supaya aplikasinya
bisa dibuka dari HP atau dibagikan ke teman. Script mencetak URL publiknya
dan memverifikasinya dari luar sebelum menyatakan tunnel siap. Tanpa opsi
`--ngrok`, server hanya berjalan lokal dan tidak memerlukan ngrok.

Dua hal yang perlu diketahui:

- Paket gratis ngrok hanya boleh **satu sesi**. Kalau ada ngrok yang masih
  jalan, tunnel baru ditolak dengan `ERR_NGROK_334`. Kalau tunnel yang lama
  memang milik project ini, `start.sh` akan **ambil alih** sendiri (menutup
  sisa frontend/backend/tunnel lama lalu start ulang). Kalau tunnelnya milik
  aplikasi lain, tutup manual dengan `pkill -x ngrok`.
- Browser (termasuk HP) akan melihat halaman peringatan ngrok **sekali** di
  kunjungan pertama. Klik "Visit Site" sekali saja, setelahnya URL langsung
  membuka aplikasinya.

> Vite secara default hanya listen di `::1` (IPv6), sehingga tunnel yang
> dialing ke `localhost`/`127.0.0.1` akan membalas 502. `start.sh` memaksa
> vite bind ke `127.0.0.1` dan menunjuk tunnel ke alamat itu secara
> eksplisit.

`start-ngrok.sh` adalah versi lama dari script yang sama; `start.sh --ngrok`
sekarang sudah mencakup tunnel plus pengecekan tambahan (port IPv4/IPv6, proses
yang mati, verifikasi URL dari luar), jadi `start-ngrok.sh` bisa dihapus.


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

Dua host terpisah, **tanpa proxy** di Vercel:

| Host | Isi |
|---|---|
| Vercel | `frontend/` — Vite → static hosting (SPA) |
| Railway | `backend/` — FastAPI (`render.yaml` / `Dockerfile`) |

Frontend memanggil backend **langsung** lewat `VITE_API_BASE_URL`; Vercel tidak
lagi menyediakan rewrite `/api` ke backend. `frontend/vercel.json` sengaja tidak
memuat blok proxy apa pun — hanya fallback SPA ke `index.html`. Konfigurasi lama
yang mengarah ke `anevision-api.onrender.com` dan mode `services` sudah dibuang.

`backend/main.py` tetap memasang router dua kali (`/health` dan `/api/health`)
agar backend bisa dipanggil dengan atau tanpa prefix selama masa transisi:

```python
app.include_router(router)                 # /health, /predict
app.include_router(router, prefix="/api")   # /api/health, /api/predict
```

### Environment variable

| Key | Scope | Value | Keterangan |
|---|---|---|---|
| `VITE_API_BASE_URL` | Vercel → frontend | `https://<backend-host>` | **Wajib.** Frontend memanggil backend langsung ke URL ini. Kalau kosong, build jatuh ke `/api` (default `frontend/.env`, untuk dev lokal) dan tidak ada server yang menjawabnya di Vercel. |
| `MODEL_MODE` | Railway → backend | `real` | **Wajib.** Default-nya `mock` membuat `/predict` menolak dengan "Eye model not loaded". |

### Langkah deploy Vercel

1. <https://vercel.com/new> → import `liygss/AneVision`.
2. **Root Directory**: `frontend` (atau biarkan kosong; `vercel.json` di root juga membangun `frontend/`).
3. **Framework Preset**: **Vite** (bukan **Services**).
4. Set `VITE_API_BASE_URL` ke URL backend Railway.
5. Deploy. Cek `https://<proyek>.vercel.app/` memuat landing page, dan
   `https://<proyek>.vercel.app/screening` (deep link) juga terbuka — fallback
   SPA menanganinya.

### Backend: wajib build lewat Dockerfile

`backend/railway.json` memaksa Railway memakai `builder: DOCKERFILE`. Tanpa itu
Railway memakai Railpack yang hanya memasang `requirements.txt`; karena
`torch`, `ultralytics`, dan `mediapipe` sengaja dipisah ke `requirements_nail.txt`,
detektor seg26/MediaPipe tidak terpasang dan deteksi kuku jatuh ke jalur `auto`
yang hanya menggambar **satu** kotak. Dockerfile memasang seluruh dependensi
(termasuk nail) ke satu interpreter, sehingga kotak deteksi kuku sama banyaknya
dengan hasil localhost.

Kalau membuat service Railway manual, set **Root Directory** ke `backend` dan
biarkan builder **Dockerfile** (jangan Railpack/Nixpacks).

### Kalau backend tidak tersedia

Situs `frontend` tetap utuh: beranda, `/demo`, dan `/about` berfungsi penuh, dan
`/demo` berjalan sepenuhnya di browser tanpa memanggil API. Halaman `/screening`
melakukan health probe ke `VITE_API_BASE_URL` lalu menampilkan pemberitahuan
kuning alih-alih gagal diam-diam. Pemeriksaan konektivitas memverifikasi
`content-type`, jadi halaman HTML yang dikembalikan host statis tidak dianggap
sebagai "server online".

### Verifikasi lokal

```bash
./start.sh
curl http://127.0.0.1:8000/health
```

`./start.sh --ngrok` juga mencetak URL publik ngrok; verifikasi dari luar bisa
dilakukan dengan:

```bash
curl -H "ngrok-skip-browser-warning: true" https://<url-ngrok>/api/health
```

