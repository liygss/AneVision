#!/usr/bin/env python3
"""Ekspor CNN kuku (resnet18_v2) ke ONNX untuk runtime AneVision.

Muat best.pt hasil c6_train_cnn_v2.py, rebuild arsitektur torchvision
resnet18 (fc -> Linear(1)), lalu export ke ONNX. Metadata preprocess
(colornorm, TTA, unit target) ikut ditulis agar modul inferensi runtime
(cnn_inference.py) memakai resep yang persis sama dengan training.

Usage:
    python experiments/hb_newdata/export_cnn_onnx.py \
        [--tag resnet18_v2] [--out-dir <seg_runtime>] [--verify]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT))

DEFAULT_SRC = ROOT / "experiments" / "hb_newdata" / "models" / "cnn"
DEFAULT_OUT = ROOT / "core" / "models" / "seg_runtime"
ONNX_NAME = "cnn_hb_resnet18_v2.onnx"
JSON_NAME = "cnn_hb_resnet18_v2.json"


def make_model(arch: str):
    import torch.nn as nn
    import torchvision.models as tvm

    if arch == "resnet18":
        m = tvm.resnet18(weights=None)
        m.fc = nn.Linear(m.fc.in_features, 1)
    elif arch == "efficientnet_b0":
        m = tvm.efficientnet_b0(weights=None)
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, 1)
    else:
        raise ValueError(arch)
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tag", default="resnet18_v2")
    ap.add_argument("--src-dir", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--out-dir", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--verify", action="store_true",
                    help="bandingkan output ONNX dgn model torch pada input random")
    args = ap.parse_args()

    import torch

    src = args.src_dir / args.tag
    pt = src / "best.pt"
    meta = json.loads((src / "model_metadata.json").read_text())
    if not pt.exists():
        sys.exit(f"bobot tidak ada: {pt}")

    arch = "resnet18" if "resnet18" in meta.get("model", "") else \
           ("efficientnet_b0" if "efficientnet" in meta.get("model", "") else "resnet18")
    model = make_model(arch)
    model.load_state_dict(torch.load(pt, map_location="cpu"))
    model.eval()

    args.out_dir.mkdir(parents=True, exist_ok=True)
    onnx_path = args.out_dir / ONNX_NAME
    json_path = args.out_dir / JSON_NAME

    dummy = torch.randn(1, 3, 224, 224)
    torch.onnx.export(
        model,
        dummy,
        str(onnx_path),
        input_names=["input"],
        output_names=["hb_gperl"],
        opset_version=18,
        dynamic_axes={"input": {0: "batch"}, "hb_gperl": {0: "batch"}},
        do_constant_folding=True,
    )

    # dynamo exporter menulis bobot ke berkas .onnx.data terpisah;
    # inline kembali ke satu berkas agar deployment & checksum sederhana.
    try:
        import onnx

        m = onnx.load(str(onnx_path))  # muat external data bila ada
        onnx.save_model(m, str(onnx_path), save_as_external_data=False)
        sidecar = onnx_path.with_suffix(".onnx.data")
        if sidecar.exists():
            sidecar.unlink()
    except ImportError:
        print("onnx tidak terpasang — biarkan format external-data")

    out_meta = {
        "model": f"CNN {arch} v2 (ONNX) -> Hb regresi",
        "arch": arch,
        "source_tag": args.tag,
        "onnx_file": ONNX_NAME,
        "colornorm": meta.get("colornorm", "none"),
        "tta": bool(meta.get("tta", False)),
        "rebalance": bool(meta.get("rebalance", False)),
        "input_size": 224,
        "resize": 256,
        "center_crop": 224,
        "imagenet_mean": [0.485, 0.456, 0.406],
        "imagenet_std": [0.229, 0.224, 0.225],
        "target_unit": "g/L",
        "output_unit": "g/dL",
        "n_images": meta.get("n_images"),
        "test_mae_gperL": meta.get("test_mae_gperL"),
        "test_mae_g_dl": meta.get("test_mae_g_dl"),
        "per_patient_mae_gperL": meta.get("per_patient_mae_gperL"),
        "per_patient_mae_g_dl": meta.get("per_patient_mae_g_dl"),
        "test_r2": meta.get("test_r2"),
        "test_pearson": meta.get("test_pearson"),
        "who_threshold_female_g_dl": 12.0,
        "who_threshold_male_g_dl": 13.0,
        "feature_pipeline": "cnn_crop_margin1.6_whitep98",
    }
    json_path.write_text(json.dumps(out_meta, indent=2))
    print(f"ONNX   -> {onnx_path} ({onnx_path.stat().st_size / 1e6:.1f} MB)")
    print(f"meta   -> {json_path}")

    if args.verify:
        import numpy as np
        import onnxruntime as ort

        x = torch.randn(2, 3, 224, 224)
        with torch.no_grad():
            ref = model(x).numpy()
        sess = ort.InferenceSession(str(onnx_path), providers=["CPUExecutionProvider"])
        got = sess.run(["hb_gperl"], {"input": x.numpy()})[0]
        diff = float(np.abs(ref - got).max())
        print(f"verify max|torch-onnx| = {diff:.6f}")
        if diff > 1e-3:
            sys.exit("verifikasi gagal: selisih terlalu besar")
    print("done")


if __name__ == "__main__":
    main()
