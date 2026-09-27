# Model yang dipakai inferensi

Enam berkas di bawah ini adalah satu-satunya bobot yang dibaca saat runtime.
Semuanya perlu ada agar `/predict` bisa menjawab.

| SHA-256 (16) | Ukuran | Peran |
|---|---|---|
| `1a6b054a66272fb0` | 1.9 KB | Ridge Regression, estimasi Hb dari citra mata (13 fitur warna) |
| `bbdb6e0fee4f98ce` | 9.0 MB | MobileNetV2 frozen, feature extractor untuk validator |
| `75ec62f690acf767` | 1.7 MB | Klasifier validator (LogisticRegression di atas MobileNetV2) |
| `361fbfabab285c32` | 6.0 MB | YOLO26-seg, segmentasi kuku |
| `fbc2a30080c3c557` | 7.0 MB | MediaPipe HandLandmarker, menemukan tangan |
| `b55d6c45d3cef397` | 19 KB | ElasticNet, estimasi Hb dari kuku (42 fitur persentil) |

Total sekitar 25 MB. Tidak ada registry eksternal: berkas ikut di dalam repo
supaya `git clone` langsung bisa dijalankan, dan Vercel membundelnya ke dalam
function (Large Functions, batas 5 GB).

## Yang sengaja tidak disertakan

- `experiments/**` — dataset (~40.000 gambar) dan checkpoint riset. Hanya
  dipakai untuk training dan evaluasi ulang, bukan untuk serving.
- `Kuku-Anemia/weights/*.pt` — `yolo11n.pt` dan `yolo26n.pt` adalah titik awal
  untuk `experiments/yolo/train.py`, bukan model yang di-deploy.
- `AINailSys/*.onnx` — penyesuaian kondisi kuku bersifat opsional, dijaga
  `try/except` di `services/nail.py`.

## Menguji integritas

```bash
shasum -a 256 -c backend/models/RUNTIME_MODELS.sha256
```

## Memverifikasi checksum

Buat ulang daftar ini setelah bobot diganti:

```bash
cd backend && shasum -a 256 \
  models/Deploy_AnemiaEyes/deploy/outputs/models/model_pipeline.joblib \
  models/Deploy_AnemiaEyes/deploy/outputs/models/mobilenet_extractor.joblib \
  models/Deploy_AnemiaEyes/deploy/outputs/models/mobilenet_anemia.joblib \
  models/Kuku-Anemia/yolo26n-seg.pt \
  models/Kuku-Anemia/core/assets/hand_landmarker.task \
  models/Kuku-Anemia/core/models/seg_runtime/elasticnet_model.joblib
```
