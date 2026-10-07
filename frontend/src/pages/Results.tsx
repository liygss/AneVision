import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, ShieldCheck, AlertTriangle, ScanSearch, RotateCcw, Eye, Hand, Microscope, Brain, Activity } from "lucide-react";
import HbGauge from "@/components/HbGauge";
import HbRangeBar from "@/components/HbRangeBar";
import ResultCard from "@/components/ResultCard";
import ConfidenceChart from "@/components/ConfidenceChart";
import Disclaimer from "@/components/Disclaimer";
import BloodDropArt from "@/components/BloodDropArt";
import AnemiaRecommendation from "@/components/AnemiaRecommendation";
import type { PredictionResult } from "@/types/prediction";

export default function Results() {
  const navigate = useNavigate();
  const [result] = useState<PredictionResult | null>(() => {
    const stored = sessionStorage.getItem("predictionResult");
    if (!stored) return null;
    try {
      return JSON.parse(stored) as PredictionResult;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!result) {
      navigate("/screening");
    }
  }, [result, navigate]);

  if (!result) return null;

  const hasNail = result.nail != null && result.nail!.estimated_hb != null;
  const hasNailError = result.nail != null && result.nail!.error != null;
  const hasFusion = result.fusion != null;
  const eyeThreshold = result.eye.threshold_used ?? 12.0;
  const nailGuardWarning = result.nail?.flags_ok === false;
  const disagree = result.models_disagree === true;

  const getRiskConfig = (level: string) => {
    switch (level) {
      case "low":
        return {
          label: "Risiko Rendah",
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
          message:
            "Hasil skrining menunjukkan kemungkinan rendah anemia. Pertahankan pola hidup sehat.",
          gradient: "from-emerald-500 to-emerald-600",
        };
      case "moderate":
        return {
          label: "Risiko Sedang",
          color: "text-amber-700 bg-amber-50 border-amber-200",
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          message:
            "Hasil skrining menunjukkan kemungkinan sedang anemia. Pertimbangkan untuk berkonsultasi dengan tenaga kesehatan dan melakukan uji hemoglobin darah.",
          gradient: "from-amber-500 to-amber-600",
        };
      case "high":
        return {
          label: "Risiko Tinggi",
          color: "text-red-700 bg-red-50 border-red-200",
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          message:
            "Hasil skrining menunjukkan kemungkinan tinggi anemia. Harap konfirmasi estimasi ini menggunakan uji hemoglobin standar dan konsultasikan dengan tenaga kesehatan profesional.",
          gradient: "from-red-500 to-red-600",
        };
      default:
        return {
          label: "Tidak Diketahui",
          color: "text-navy-700 bg-navy-50 border-navy-200",
          icon: <AlertTriangle className="w-5 h-5 text-navy-500" />,
          message: "Tingkat risiko tidak dapat ditentukan.",
          gradient: "from-navy-500 to-navy-600",
        };
    }
  };

  const risk = getRiskConfig(result.risk_level);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-navy-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Back */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-8"
        >
          <Link
            to="/screening"
            className="group inline-flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700 transition-base"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Skrining Baru
          </Link>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <span className="inline-block text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">Hasil Analisis</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-navy-900 mb-3">
            Hasil Skrining
          </h1>
          <p className="text-navy-500 text-sm md:text-base">
            Estimasi skrining anemia berbasis AI dari analisis citra mata
            {hasNail ? " dan kuku" : ""}.
          </p>
        </motion.div>

        {/* Main Result Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mb-8"
        >
          <div className="relative bg-white rounded-2xl border border-navy-100/80 shadow-lg overflow-hidden">
            {/* Gradient header */}
            <div className={`bg-gradient-to-r ${risk.gradient} px-6 py-3`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-white">
                  {risk.icon}
                  <span className="text-sm font-bold">{risk.label}</span>
                </div>
                <div className="flex items-center gap-2 text-white/70">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs">
                    {new Date().toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
                {/* Left: blood drop, coloured and filled by the result */}
                <div className="flex-shrink-0 relative">
                  <div
                    className={`absolute inset-0 rounded-[2.5rem] blur-2xl ${
                      result.risk_level === "low"
                        ? "bg-emerald-300/20"
                        : result.risk_level === "moderate"
                          ? "bg-amber-300/20"
                          : "bg-rose-300/20"
                    }`}
                  />
                  <BloodDropArt
                    className="relative w-36 h-40 md:w-44 md:h-48"
                    animate={true}
                    value={result.estimated_hb}
                    threshold={eyeThreshold}
                    showValue={true}
                  />
                </div>

                {/* Right: details */}
                <div className="flex-1 w-full min-w-0 text-center md:text-left">
                  <p className="text-[11px] font-bold text-navy-600 uppercase tracking-[0.14em] mb-1">
                    Estimasi Hemoglobin AI
                  </p>
                  <p className="text-xs text-navy-600 mb-5 max-w-md mx-auto md:mx-0 leading-relaxed">
                    {risk.message}
                  </p>

                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-navy-700">Rentang estimasi</span>
                    <span className="text-sm font-extrabold text-navy-900 tabular-nums">
                      {result.estimated_range
                        ? `${result.estimated_range.min.toFixed(1)} – ${result.estimated_range.max.toFixed(1)} g/dL`
                        : "-"}
                    </span>
                  </div>
                  <HbRangeBar
                    value={result.estimated_hb}
                    range={result.estimated_range}
                    threshold={eyeThreshold}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Gauge + Confidence */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className={`grid gap-6 mb-8 ${hasNail ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}
        >
          <HbGauge value={result.estimated_hb} threshold={eyeThreshold} />
          <ConfidenceChart
            eyeConfidence={result.eye.confidence || result.confidence}
            nailConfidence={hasNail ? result.nail!.confidence : null}
            combinedConfidence={result.confidence}
          />
        </motion.div>

        {/* Eye + Nail + Combined */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
          className={`grid gap-6 mb-8 ${hasNail ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}
        >
          <ResultCard
            title="Analisis Mata"
            estimatedHb={result.eye.hgb_predicted || result.eye.estimated_hb || result.estimated_hb}
            confidence={result.eye.confidence || result.confidence}
            icon={<Eye className="w-5 h-5 text-primary-600" />}
            threshold={eyeThreshold}
          />
          <ResultCard
            title={hasFusion ? "Estimasi Akhir (Gabungan)" : "Estimasi Skrining Akhir"}
            estimatedHb={result.estimated_hb}
            confidence={result.confidence}
            icon={<Microscope className="w-5 h-5 text-primary-600" />}
            variant="highlighted"
            threshold={eyeThreshold}
          />
          {hasNail && (
            <div>
              <ResultCard
                title="Analisis Kuku"
                estimatedHb={result.nail!.estimated_hb!}
                confidence={result.nail!.confidence!}
                icon={<Hand className="w-5 h-5 text-primary-600" />}
                threshold={result.nail!.threshold_used ?? eyeThreshold}
              />
              {(result.nail?.issues || result.nail?.error) && (
                <p className="mt-1.5 text-[11px] text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  {result.nail.issues || result.nail.error}
                </p>
              )}
            </div>
          )}
          {!hasNail && hasNailError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Hand className="w-5 h-5 text-amber-600" />
                </span>
                <p className="text-sm font-bold text-amber-800">Analisis Kuku</p>
              </div>
              <p className="text-xs text-amber-700">{result.nail!.error}</p>
            </div>
          )}
        </motion.div>

        {/* Models disagree warning */}
        {disagree && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.28 }}
            className="mb-8"
          >
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Estimasi mata dan kuku tidak sepakat</p>
                <p className="text-xs text-amber-700 mt-1">
                  Selisih antara estimasi mata dan kuku cukup besar.
                  Kami menyarankan untuk mengulangi skrining atau mengonfirmasi hasil ini dengan uji hemoglobin darah.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Nail guard warning */}
        {hasNail && nailGuardWarning && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.28 }}
            className="mb-8"
          >
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">Peringatan hasil kuku</p>
                <p className="text-xs text-amber-700 mt-1">
                  {result.nail?.issues || "Analisis kuku melewati batas plausibilitas; hasil tetap ditampilkan dengan kewaspadaan lebih tinggi."}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Normal reference ranges */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="mb-8"
        >
          <div className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-5">
            <p className="text-xs font-bold text-navy-700 uppercase tracking-wider mb-3">Rentang Normal Hemoglobin (WHO)</p>
            <div className="flex flex-wrap gap-3 text-xs text-navy-600">
              <span className="px-3 py-1.5 bg-blue-50 border border-blue-200/60 rounded-lg font-medium">Pria: 13.0 – 17.5 g/dL</span>
              <span className="px-3 py-1.5 bg-pink-50 border border-pink-200/60 rounded-lg font-medium">Wanita: 12.0 – 15.5 g/dL</span>
              <span className="px-3 py-1.5 bg-purple-50 border border-purple-200/60 rounded-lg font-medium">Ibu Hamil: ≥ 11.0 g/dL</span>
            </div>
            <p className="text-[11px] text-navy-500 mt-2">Threshold anemia yang digunakan: {eyeThreshold.toFixed(1)} g/dL</p>
          </div>
        </motion.div>

        {/* Model Details (if available) */}
        {result.eye.source && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.28 }}
            className="mb-8"
          >
            <div className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-navy-900">Detail Validasi Model</h3>
                <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${
                  result.eye.source === "ensemble_Ridge+MobileNetV2"
                    ? "bg-primary-50 text-primary-700 border border-primary-200"
                    : "bg-navy-50 text-navy-500 border border-navy-200"
                }`}>
                  {result.eye.source === "ensemble_Ridge+MobileNetV2" ? "Ensemble (2 Model)" : "Ridge Only"}
                </span>
              </div>

              {/* Ridge + CNN side by side */}
              <div className={`grid gap-4 ${result.eye.status_cnn ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                {/* Ridge */}
                <div className={`rounded-xl p-5 border-2 ${
                  result.eye.status_ridge === "Anemia"
                    ? "bg-red-50 border-red-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-navy-600" />
                    <p className="text-xs font-bold text-navy-600 uppercase tracking-wider">Ridge Regression</p>
                    <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full ml-auto border border-primary-200">Penentu Hasil</span>
                  </div>
                  <p className={`text-xl font-extrabold ${
                    result.eye.status_ridge === "Anemia" ? "text-red-700" : "text-emerald-700"
                  }`}>
                    {result.eye.status_ridge || "-"}
                  </p>
                  <p className="text-xs text-navy-500 mt-1">Hgb: {result.eye.hgb_predicted?.toFixed(1)} g/dL</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">Threshold WHO: ≥ {result.eye.threshold_used}</span>
                    <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">MAE: ±1.3 g/dL</span>
                    <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">R²: 0.503</span>
                  </div>
                </div>

                {/* CNN */}
                {result.eye.status_cnn && (
                  <div className={`rounded-xl p-5 border-2 ${
                    result.eye.status_cnn === "Anemia"
                      ? "bg-red-50 border-red-200"
                      : "bg-emerald-50 border-emerald-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-navy-600" />
                      <p className="text-xs font-bold text-navy-600 uppercase tracking-wider">MobileNetV2 CNN</p>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full ml-auto border border-amber-200">Referensi</span>
                    </div>
                    <p className={`text-xl font-extrabold ${
                      result.eye.status_cnn === "Anemia" ? "text-red-700" : "text-emerald-700"
                    }`}>
                      {result.eye.status_cnn}
                    </p>
                    {result.eye.cnn_probability != null && (
                      <p className="text-xs text-navy-500 mt-1">
                        Probabilitas: {(result.eye.cnn_probability * 100).toFixed(1)}%
                        {result.eye.cnn_raw_probability != null && result.eye.cnn_raw_probability !== result.eye.cnn_probability && (
                          <span className="text-navy-500 ml-1">(mentah: {(result.eye.cnn_raw_probability * 100).toFixed(1)}%)</span>
                        )}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">Precision: 65.6%</span>
                      <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">Recall: 80.0%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Explanation text */}
              <div className="mt-4 p-3 bg-navy-50/40 rounded-xl border border-navy-100/50">
                <p className="text-[11px] text-navy-500 leading-relaxed">
                  <strong className="text-navy-700">Hasil akhir berdasarkan Ridge Regression</strong> (penentu hasil).
                  {result.eye.status_cnn && result.eye.status_ridge !== result.eye.status_cnn && (
                    <> CNN menunjukkan hasil berbeda karena <strong className="text-amber-600">overconfidence pada data kecil</strong> (211 gambar). CNN sering false-positive (precision 65.6%).</>
                  )}
                  {result.eye.status_cnn && result.eye.status_ridge === result.eye.status_cnn && (
                    <> Kedua model sepakat. CNN hanya referensi; probabilitas ekstrem (0/100%) adalah batasan data kecil, bukan keyakinan klinis.</>
                  )}
                  {!result.eye.status_cnn && " CNN belum terintegrasi."}
                </p>
              </div>

              {/* Threshold + Margin */}
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-navy-500">
                {result.eye.margin_ke_threshold != null && (
                  <span>Margin: <span className={`font-bold ${result.eye.margin_ke_threshold < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {result.eye.margin_ke_threshold > 0 ? "+" : ""}{result.eye.margin_ke_threshold.toFixed(2)} g/dL
                  </span>
                  {result.eye.margin_ke_threshold < 0 && " (di bawah threshold)"}</span>
                )}
              </div>

              {/* Nail Model Details */}
              {hasNail && result.nail && (
                <div className={`rounded-xl p-5 border-2 mt-4 ${
                  result.nail!.status === "Rendah (Anemia)"
                    ? "bg-red-50 border-red-200"
                    : "bg-emerald-50 border-emerald-200"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Hand className="w-4 h-4 text-navy-600" />
                    <p className="text-xs font-bold text-navy-600 uppercase tracking-wider">Kuku · CNN ResNet18</p>
                    <span className="text-[10px] font-bold bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full ml-auto">Weight: {((result.nail!.weight || 0) * 100).toFixed(1)}%</span>
                  </div>
                  <p className={`text-xl font-extrabold ${
                    result.nail!.status === "Rendah (Anemia)" ? "text-red-700" : "text-emerald-700"
                  }`}>
                    {result.nail!.status}
                  </p>
                  <p className="text-xs text-navy-500 mt-1">Hgb: {result.nail!.estimated_hb?.toFixed(1)} g/dL (raw + koreksi {(result.nail!.bias_correction ?? 0).toFixed(1)} g/dL)</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">Threshold: ≥ {result.nail!.threshold_used}</span>
                    <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">MAE: ±{result.nail!.mae} g/dL</span>
                    <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">R²: 0.312</span>
                    <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">Deteksi: seg26 · conf {(result.nail!.hand_confidence || 0).toFixed(2)}</span>
                    {result.nail!.nail_count != null && result.nail!.nail_count! > 1 && (
                      <span className="text-[10px] bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">{result.nail!.nail_count} kuku (median)</span>
                    )}
                  </div>
                  {result.nail?.issues && (
                    <div className="mt-2 text-[11px] text-amber-700 bg-amber-100/60 rounded-lg px-3 py-1.5 border border-amber-200">
                      {result.nail.issues}
                    </div>
                  )}
                </div>
              )}

              {/* Fusion Weights */}
              {hasFusion && result.fusion && (
                <div className="mt-4 p-4 bg-primary-50/40 rounded-xl border border-primary-200/60">
                  <p className="text-xs font-bold text-primary-800 uppercase tracking-wider mb-2">Weighted Fusion (by MAE)</p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-navy-600">
                    <span>Mata: <strong className="text-navy-800">{((result.fusion!.eye_weight || 0) * 100).toFixed(1)}%</strong> (MAE 1.3)</span>
                    <span>Kuku: <strong className="text-navy-800">{((result.fusion!.nail_weight || 0) * 100).toFixed(1)}%</strong> (MAE 2.6)</span>
                    <span className="text-primary-700 font-bold">→ Hb Gabungan: {result.fusion!.estimated_hb?.toFixed(1)} g/dL</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Explainable AI */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="mb-8"
        >
          <div className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-6">
            <h3 className="text-lg font-bold text-navy-900 mb-4">Peta Perhatian AI</h3>
            <div className={`grid gap-4 ${hasNail ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
              <div className="border border-navy-100/60 rounded-xl p-4 bg-navy-50/25">
                <p className="text-sm font-bold text-navy-700 mb-3">Peta Perhatian Mata</p>
                {result.explanation?.eye_heatmap ? (
                  <img
                    src={`data:image/png;base64,${result.explanation.eye_heatmap}`}
                    alt="Peta Perhatian Mata"
                    className="w-full rounded-lg border border-navy-100/60"
                  />
                ) : (
                  <div className="h-40 flex flex-col items-center justify-center text-sm text-navy-500 bg-white rounded-lg border border-dashed border-navy-200">
                    <ScanSearch className="w-8 h-8 text-navy-500 mb-2" />
                    Visualisasi penjelasan akan muncul setelah model terintegrasi.
                  </div>
                )}
              </div>
              {hasNail && (
                <div className="border border-navy-100/60 rounded-xl p-4 bg-navy-50/25">
                  <p className="text-sm font-bold text-navy-700 mb-3">Peta Perhatian Kuku</p>
                  {result.explanation?.nail_heatmap ? (
                    <img
                      src={`data:image/png;base64,${result.explanation.nail_heatmap}`}
                      alt="Peta Perhatian Kuku"
                      className="w-full rounded-lg border border-navy-100/60"
                    />
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center text-sm text-navy-500 bg-white rounded-lg border border-dashed border-navy-200">
                      <ScanSearch className="w-8 h-8 text-navy-500 mb-2" />
                      {result.nail?.error
                        ? "Kuku tidak terdeteksi jelas pada foto."
                        : "Kuku terdeteksi, tetapi area kuku belum cukup jelas untuk visualisasi."}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Anemia Classification & Recommendation */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <AnemiaRecommendation
            estimatedHb={result.estimated_hb}
            confidence={result.confidence}
            estimatedRange={result.estimated_range}
          />
        </motion.div>

        {/* General Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.48 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-primary-50/50 to-primary-50/25 border border-primary-100/60 rounded-2xl p-6">
            <h3 className="text-base font-bold text-navy-900 mb-3">Catatan Penting</h3>
            <ul className="space-y-2.5">
              {[
                "Estimasi skrining berbasis AI ini harus dikonfirmasi menggunakan uji hemoglobin darah standar.",
                "Jika hasil menunjukkan risiko tinggi, pertimbangkan untuk berkonsultasi dengan tenaga kesehatan profesional.",
                "Prediksi berbasis citra dapat dipengaruhi oleh pencahayaan, kualitas kamera, pigmen kulit, sudut gambar, dan ketajaman gambar.",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-navy-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-2 flex-shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <Disclaimer />

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="text-center mt-8"
        >
          <Link
            to="/screening"
            className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold shadow-lg shadow-primary-600/20 hover:from-primary-700 hover:to-primary-800 transition-smooth text-sm hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            Skrining Baru
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
