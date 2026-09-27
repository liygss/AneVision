# Anemia Detection — Inference Module (Web Integration)

Modul inferensi untuk memprediksi **anemia** dari gambar konjungtiva mata.
Digunakan oleh backend web (FastAPI/Flask) via fungsi `predict_from_image`.

## Struktur

```
deploy/
├── inference.py              # ⭐ FUNGSI YANG DIPAKAI WEB
├── feature_extraction.py     # masking (dependency inference)
├── requirements.txt          # dependencies
├── MODEL_CONTRACT.md         # spesifikasi input/output LENGKAP
├── evaluation_report.json    # metrik model (dokumentasi)
└── outputs/models/
    ├── model_pipeline.joblib        # Ridge (sumber Hgb)
    ├── mobilenet_extractor.joblib   # MobileNetV2 (feature extractor)
    └── mobilenet_anemia.joblib      # classifier anemia
```

## Cara pakai (minimal)

```bash
pip install -r requirements.txt

python -c "import cv2; from inference import predict_from_image
img = cv2.imread('path/gambar.jpg')       # wajib BGR
print(predict_from_image(img, gender='F'))"
```

Untuk integrasi web, baca **`MODEL_CONTRACT.md`** terlebih dahulu —
dokumen itu berisi format input, skema output JSON, dan aturan penting untuk
tampilkan hasil (disclaimer, models_disagree, margin).

## Catatan penting

- **`gender` wajib** diisi user ("F"/"M"). Tanpa gender tidak ada prediksi.
- **TensorFlow di-load lazy** — prediksi Ridge bisa jalan tanpa TF diimpor penuh,
  tapi score & status CNN membutuhkan TF (dibutuhkan untuk ensemble penuh).
- Hasil bersifat **skrining edukatif**, bukan diagnosis medis (disclaimer ada di output).
- **JANGAN sertakan dataset/** atau **test_images/** ke repo ini.

## Model (ringkasan)

| Bagian | Model | Output |
|--------|-------|--------|
| Ridge | 13 fitur warna manual | Hgb (g/dL) |
| MobileNetV2 | gambar mentah 224×224 | probabilitas anemia |
| Ensemble | majority vote | status Anemia/Normal + confidence |

Metrik jujur: lihat `evaluation_report.json` dan bagian Kinerja di `MODEL_CONTRACT.md`.