# MODEL CONTRACT — Anemia Prediction from Conjunctival Image

Dokumen ini adalah kontrak integrasi antara **model inference** dan **backend web** (FastAPI/Flask apa pun).
Baca dokumen ini SAJA sudah cukup untuk memakai model — tidak perlu membuka/memahami kode training.

**VERSI ENSEMBLE (Ridge + MobileNetV2).** Sistem kini memakai 2 model yang di-fuse (majority voting):

| Model | Input | Output | Peran |
|-------|-------|--------|-------|
| **Ridge** (`model_pipeline.joblib`) | 13 fitur warna manual | Hgb (g/dL) | Sumber `hgb_predicted` |
| **MobileNetV2** (`mobilenet_extractor.joblib` + `mobilenet_anemia.joblib`) | gambar mentah (224×224) | probabilitas anemia | Validator status |

---

## 1. Apa yang diberikan modul ini

| File | Peran |
|------|-------|
| `inference.py` | Fungsi prediksi siap pakai: `predict_from_image(img_bgr, gender)` |
| `feature_extraction.py` | Ekstraktor fitur manual untuk Ridge (komponen internal) |
| `outputs/models/model_pipeline.joblib` | Ridge pipeline (13 fitur + scaler + thresholds) |
| `outputs/models/mobilenet_extractor.joblib` | MobileNetV2 (frozen, feature extractor 62720-d) |
| `outputs/models/mobilenet_anemia.joblib` | Scaler + LogisticRegression (anemia classifier) |

**Dependency:** `numpy`, `opencv-python`, `scikit-image`, `scikit-learn`, `joblib`, `tensorflow/keras` (TensorFlow di-load lazy — hanya saat cnn dipakai)

---

## 2. Cara memakai (minimal 5 baris)

```python
import cv2
from inference import predict_from_image

img_bgr = cv2.imread("path/ke/gambar/mata.jpg")   # wajib BGR (default cv2.imread)
result  = predict_from_image(img_bgr, gender="F") # satu suara
print(result)
```

Atau jika gambar datang dari upload (byte stream):

```python
import cv2, numpy as np
from inference import predict_from_image

buf  = np.frombuffer(bytes_upload, dtype=np.uint8)
img  = cv2.imdecode(buf, cv2.IMREAD_COLOR)        # hasil dekode sudah BGR
result = predict_from_image(img, gender="M")
```

---

## 3. Format INPUT

| Parameter | Tipe | Syarat | Contoh |
|-----------|------|--------|--------|
| `img_bgr` | `numpy.ndarray` | Gambar BGR non-kosong (hasil `cv2.imread` / `cv2.imdecode`). Tidak wajib ukuran tertentu. | `img_bgr` |
| `gender` | `str` | Case-insensitive. `"F"`, `"Female"`, `"P"`, `"Perempuan"`, `"Wanita"` → dianggap **wanita**. Selain itu dianggap **pria**. | `"F"` |

> Jika gambar tidak valid (kosong, bukan gambar, ROI konjungtiva tidak terdeteksi), fungsi mengembalikan dict berisi key `error` (bukan exception).

---

## 4. Format OUTPUT (JSON-ready)

### 4a. Sukses (ensemble)

```json
{
  "hgb_predicted": 11.2,
  "status": "Anemia",
  "status_ridge": "Anemia",
  "status_cnn": "Normal",
  "models_disagree": true,
  "source": "ensemble_Ridge+MobileNetV2",
  "cnn_probability": 0.31,
  "confidence": 0.55,
  "threshold_used": 12.0,
  "margin_ke_threshold": -0.8,
  "gender": "Wanita",
  "disclaimer": "Hasil ini untuk skrining edukatif, bukan pengganti diagnosis medis"
}
```

Ketika MobileNetV2 tidak tersedia/gagal load, `source` menjadi `"Ridge_only"`, field CNN dihilangkan, dan status diambil dari Ridge.

### 4b. Gagal (gambar tidak valid)

```json
{
  "error": "Gambar tidak valid / ROI konjungtiva tidak terdeteksi"
}
```

---

## 5. Deskripsi field output

| Field | Tipe | Makna |
|-------|------|-------|
| `hgb_predicted` | `float` | Prediksi kadar hemoglobin (g/dL) — dari Ridge |
| `status` | `str` | `"Anemia"` / `"Normal"` — hasil ensemble (majority vote) |
| `status_ridge` | `str` | Status dari Ridge (via threshold WHO) |
| `status_cnn` | `str` | Status dari MobileNetV2 (via prob ≥0.5) |
| `models_disagree` | `bool` | `true` jika kedua model berbeda pendapat → hasil **Anemia (konservatif, perlu konfirmasi lab)** |
| `source` | `str` | `"ensemble_Ridge+MobileNetV2"` atau `"Ridge_only"` |
| `cnn_probability` | `float` | Probabilitas anemia versi MobileNetV2 (0–1) |
| `confidence` | `float` | Skor gabungan (0–1); `margin/5` Ridge + confidence CNN, dirata-rata |
| `threshold_used` | `float` | Ambang WHO sesuai gender: **wanita 12.0**, **pria 13.0** g/dL |
| `margin_ke_threshold` | `float` | `hgb_predicted - threshold`. **Negatif = bawah ambang (anemia)**; makin dekat ke 0 berarti butuh konfirmasi ulang |
| `gender` | `str` | `"Wanita"` / `"Pria"` (interpretasi input gender yang dipakai) |
| `disclaimer` | `str` | Catatan edukatif yang **harus** ditampilkan ke pengguna |
| `error` | `str` | Hanya ada saat prediksi gagal; menggantikan field lain |

---

## 6. Aturan penting untuk tim backend

1. **Wajib menampilkan `disclaimer`** kepada pengguna di UI (ini syarat pemakaian etis/edukatif).
2. **Interpretasi status** menggunakan `threshold_used`, BUKAN hardcode sendiri.
3. **Margin negatif** (`margin_ke_threshold < 0`) = indikasi anemia → beri saran konsultasi medis.
4. **Margin kecil** (mis. `|margin| < 1.0`) = hasil borderline → sarankan tes lab untuk memastikan.
5. **`models_disagree == true`** wajib disorot (badge/warning "model berbeda pendapat, perlu konfirmasi lab") — jangan ditampilkan sebagai hasil pasti.
6. Jangan menyampaikan hasil sebagai "diagnosis" ke pengguna; sampaikan sebagai **skrining edukatif**.
7. Gunakan `gender` yang asli (diisi pengguna) sebagai input; jangan ditebak.

---

## 7. Kinerja model (estimasi jujur, 5-fold CV, out-of-fold)

### Ridge (regresi Hgb)
- MAE: **1.296 ± 0.155 g/dL** | RMSE 1.646 | R² 0.503
- Klasifikasi (threshold WHO): acc **0.758**, precision **0.710**, recall **0.733**, F1 **0.721**

### MobileNetV2 (frozen ImageNet + LogisticRegression, klasifikasi anemia)
- acc **0.734 ± 0.032**, recall **0.800 ± 0.084**, precision **0.656 ± 0.033**, F1 **0.719 ± 0.038**
- CNN punya recall (sensitivitas) lebih tinggi → lebih jarang "miss" anemia, tapi lebih sering false-positive
- Confusion matrix per fold disimpan di `outputs/models/mobilenet_cv_metrics.json`

### Catatan
- CNN bisa tampil very-confident (prob 0/1) pada beberapa gambar — ini overconfidence umum pada data kecil (211 gambar). Jangan jadikan angka prob sebagai "tingkat kepastian klinis".
- Untuk laporan/demo, gunakan angka di atas. **JANGAN klaim akurasi 100%.**

---

## 8. Kontak / identitas artifact

- Ridge: `outputs/models/model_pipeline.joblib` — `feature_order` (13): `mean_R..n_valid_px, is_female`; thresholds `{female:12.0, male:13.0}`
- CNN: `outputs/models/mobilenet_extractor.joblib` (MobileNetV2 224×224) + `outputs/models/mobilenet_anemia.joblib` (scaler + LogisticRegression, threshold 0.5)