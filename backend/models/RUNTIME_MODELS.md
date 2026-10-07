# Model yang dipakai inferensi

Delapan berkas di bawah ini adalah bobot yang dibaca saat runtime.
Semuanya perlu ada agar `/predict` bisa menjawab (CNN kuku punya fallback
ElasticNet, tapi keduanya didaftarkan agar integritas bisa diuji).

| SHA-256 (16) | Ukuran | Peran |
|---|---|---|
| `1a6b054a66272fb0` | 1.9 KB | Ridge Regression, estimasi Hb dari citra mata (13 fitur warna) |
| `bbdb6e0fee4f98ce` | 9.0 MB | MobileNetV2 frozen, feature extractor untuk validator |
| `75ec62f690acf767` | 1.7 MB | Klasifier validator (LogisticRegression di atas MobileNetV2) |
| `361fbfabab285c32` | 6.0 MB | YOLO26-seg, segmentasi kuku |
| `fbc2a30080c3c557` | 7.0 MB | MediaPipe HandLandmarker, menemukan tangan |
| `48b69766af2479d5` | 43 MB | **CNN ResNet18 v2 (ONNX)**, estimasi Hb dari crop kuku — model utama |
| `50d8b14579791832` | <1 KB | Metadata preprocess/metric CNN kuku (colornorm, TTA, MAE) |
| `b55d6c45d3cef397` | 19 KB | ElasticNet, fallback Hb kuku (42 fitur persentil) bila ONNX gagal load |

Total sekitar 68 MB. Tidak ada registry eksternal: berkas ikut di dalam repo
supaya `git clone` langsung bisa dijalankan, dan Vercel membundelnya ke dalam
function (Large Functions, batas 5 GB).

## Alur kuku

```
cnn_hb_resnet18_v2.onnx  ->  core/cnn_inference.NailHbCnnModel  (utama)
      (gagal load)        ->  core/inference.NailHbModel (ElasticNet)  (fallback)
```

Ekspor ulang ONNX: `python experiments/hb_newdata/export_cnn_onnx.py --verify`
(needs torch; bobot sumber `experiments/hb_newdata/models/cnn/resnet18_v2/best.pt`).

## Yang sengaja tidak disertakan

- `experiments/**` — dataset dan checkpoint riset. Hanya dipakai untuk
  training dan evaluasi ulang, bukan untuk serving.
- `Kuku-Anemia/weights/*.pt` — `yolo11n.pt` dan `yolo26n.pt` adalah titik awal
  untuk `experiments/yolo/train.py`, bukan model yang di-deploy.
- `AINailSys/*.onnx` — penyesuaian kondisi kuku bersifat opsional, dijaga
  `try/except` di `services/nail_worker.py`.
- `seg_runtime_backup_*` — cadangan ElasticNet sebelum pindah ke CNN; tidak
  dibaca runtime.

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
  models/Kuku-Anemia/core/models/seg_runtime/elasticnet_model.joblib \
  models/Kuku-Anemia/core/models/seg_runtime/cnn_hb_resnet18_v2.onnx \
  models/Kuku-Anemia/core/models/seg_runtime/cnn_hb_resnet18_v2.json
```
