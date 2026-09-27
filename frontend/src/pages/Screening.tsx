import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  AlertCircle,
  Lightbulb,
  Eye,
  Focus,
  Sun,
  Ban,
  Crosshair,
  CheckCircle2,
  ChevronRight,
  Shield,
  Hand,
  Camera,
  User,
  Venus,
  Mars,
  ScanSearch,
  Layers,
  FlaskConical,
  Zap,
  ListChecks,
} from "lucide-react";
import UploadCard from "@/components/UploadCard";
import Disclaimer from "@/components/Disclaimer";
import EyeArt from "@/components/EyeArt";
import { slimPrediction } from "@/lib/utils";
import NailArt from "@/components/NailArt";
import BloodDropArt from "@/components/BloodDropArt";
import NailBoxCrop, { type NailBox } from "@/components/NailBoxCrop";
import { analyzeImages, BackendUnreachableError } from "@/services/api";
import BackendNotice from "@/components/BackendNotice";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import type { PredictionResult } from "@/types/prediction";

const tips = [
  { icon: <Sun className="w-3.5 h-3.5" />, text: "Pencahayaan baik" },
  { icon: <Ban className="w-3.5 h-3.5" />, text: "Hindari bayangan" },
  { icon: <Ban className="w-3.5 h-3.5" />, text: "Tanpa filter" },
  { icon: <Focus className="w-3.5 h-3.5" />, text: "Gambar fokus" },
  { icon: <Crosshair className="w-3.5 h-3.5" />, text: "Area tepat sasaran" },
  { icon: <Eye className="w-3.5 h-3.5" />, text: "Tidak buram" },
];

export default function Screening() {
  const [eyeFile, setEyeFile] = useState<File | null>(null);
  const [nailFile, setNailFile] = useState<File | null>(null);
  const [gender, setGender] = useState<string>("F");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [nailBox, setNailBox] = useState<NailBox | null>(null);
  const [showCrop, setShowCrop] = useState(false);
  const [showRetry, setShowRetry] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [pendingResult, setPendingResult] = useState<PredictionResult | null>(null);
  const nailBoxRef = useRef<NailBox | null>(null);
  const navigate = useNavigate();
  const { state: backendState, retry: retryBackend } = useBackendStatus();
  const [backendOffline, setBackendOffline] = useState(false);

  const activeStep = eyeFile ? 1 : 0;
  const canAnalyze = eyeFile !== null && !loading;

  const totalImages = (eyeFile ? 1 : 0) + (nailFile ? 1 : 0);

  const loadingSteps = nailFile
    ? [
        { label: "Mempersiapkan gambar", icon: <Layers className="w-4 h-4" /> },
        { label: "Menganalisis gambar mata", icon: <Eye className="w-4 h-4" /> },
        { label: "Menganalisis gambar kuku", icon: <Hand className="w-4 h-4" /> },
        { label: "Menghasilkan hasil skrining", icon: <FlaskConical className="w-4 h-4" /> },
      ]
    : [
        { label: "Mempersiapkan gambar", icon: <Layers className="w-4 h-4" /> },
        { label: "Menganalisis gambar mata", icon: <Eye className="w-4 h-4" /> },
        { label: "Menghasilkan hasil skrining", icon: <FlaskConical className="w-4 h-4" /> },
      ];

  const handleAnalyze = useCallback(
    async (overrideBox?: NailBox) => {
      if (!eyeFile) return;
      setLoading(true);
      setError(null);
      setShowRetry(false);

      const box = overrideBox !== undefined ? overrideBox : nailBoxRef.current;

      const startTime = Date.now();
      const MIN_LOADING_MS = 3000;

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        stepIndex = (stepIndex + 1) % loadingSteps.length;
        setLoadingStep(stepIndex);
      }, 2000);
      setLoadingStep(0);

      try {
        const result = await analyzeImages(eyeFile, nailFile, gender, box);

        const elapsed = Date.now() - startTime;
        if (elapsed < MIN_LOADING_MS) {
          await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
        }

        clearInterval(stepInterval);

        const nailErr = result.nail?.error ?? null;
        const detectionRelated =
          nailErr && /tangan tidak terdeteksi|area kuku|jari|terlalu sempit|gagal|merespons|tandai/i.test(nailErr);

        if (nailFile && !box && detectionRelated) {
          setPendingResult(result);
          setRetryError(nailErr);
          setShowRetry(true);
          setLoading(false);
          return;
        }

        try {
          const stored = await slimPrediction(result);
          sessionStorage.setItem("predictionResult", JSON.stringify(stored));
        } catch {
          try {
            sessionStorage.setItem(
              "predictionResult",
              JSON.stringify({ ...result, explanation: undefined })
            );
          } catch {
            // even minimal payload exceeds quota
          }
        }
        navigate("/results");
      } catch (err: any) {
        clearInterval(stepInterval);
        if (err instanceof BackendUnreachableError) {
          setBackendOffline(true);
          setError(err.message);
        } else {
          setError(
            err.message || "Kami tidak dapat menganalisis gambar. Pastikan gambar jelas dan coba lagi."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [eyeFile, nailFile, gender, navigate, loadingSteps.length]
  );

  const handleRetry = useCallback(() => {
    setShowCrop(true);
  }, []);

  const handleCropConfirm = useCallback(
    (box: NailBox) => {
      const valid = [box.l, box.t, box.r, box.b].every((v) => Number.isFinite(v));
      const boxRef = valid ? box : null;
      nailBoxRef.current = boxRef;
      setNailBox(boxRef);
      setShowCrop(false);
      setPendingResult(null);
      setRetryError(null);
      handleAnalyze(boxRef ?? undefined);
    },
    [handleAnalyze]
  );

  const handleCropCancel = useCallback(() => {
    setShowCrop(false);
  }, []);

  const handleNailSelect = useCallback((f: File) => {
    setNailFile(f);
    setNailBox(null);
    nailBoxRef.current = null;
    setShowRetry(false);
    setPendingResult(null);
  }, []);

  const handleNailRemove = useCallback(() => {
    setNailFile(null);
    setNailBox(null);
    nailBoxRef.current = null;
    setShowRetry(false);
    setPendingResult(null);
  }, []);

  const handleEyeOnly = useCallback(() => {
    if (pendingResult) navigate("/results");
  }, [pendingResult, navigate]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ============ BACKGROUND ============ */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary-50/30 via-white to-white" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[560px] h-[560px] bg-primary-100/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* ============ HERO HEADER ============ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10"
        >
          <div className="relative bg-white rounded-3xl border border-navy-100/60 shadow-sm overflow-hidden">
            {/* Gradient mesh bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/50 via-white to-cyan-50/30 pointer-events-none" />
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-100/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-cyan-100/25 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-6 p-6 sm:p-8 items-center">
              {/* Left: text content */}
              <div className="lg:col-span-3 text-center lg:text-left">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.08 }}
                  className="inline-flex items-center gap-1.5 bg-white text-primary-700 px-4 py-2 rounded-full text-sm font-semibold border border-primary-100 shadow-sm mb-5"
                >
                  <Shield className="w-4 h-4" />
                  Skrining Berbasis AI
                </motion.div>

                <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] font-extrabold text-navy-900 mb-3 tracking-tight leading-tight">
                  Skrining{" "}
                  <span className="text-gradient">Anemia</span>
                </h1>
                <p className="text-navy-500 max-w-md text-sm md:text-base leading-relaxed mb-4 mx-auto lg:mx-0">
                  Unggah gambar mata (dan kuku jika ada) untuk mendapatkan estimasi kadar hemoglobin
                  berbasis AI. Cepat, non-invasif, dan sepenuhnya melalui browser.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-navy-500">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary-500" />
                    <span className="font-medium">Non-invasif</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-primary-500" />
                    <span className="font-medium">Hasil dalam detik</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-primary-500" />
                    <span className="font-medium">Via kamera ponsel</span>
                  </div>
                </div>
              </div>

              {/* Right: photo cards */}
              <div className="lg:col-span-2 flex items-center justify-center">
                <div className="relative w-full max-w-[320px]">
                  {/* Eye photo card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20, rotate: -3 }}
                    animate={{ opacity: 1, x: 0, rotate: -3 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative z-10 bg-white rounded-2xl border border-white/60 shadow-xl shadow-navy-900/12 overflow-hidden w-[180px] sm:w-[200px]"
                  >
                    <div className="relative">
                      <img
                        src="/image/eye-closeup.jpg"
                        alt="Pemeriksaan mata untuk skrining anemia"
                        className="w-full aspect-[4/5] object-cover"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
                      {/* Badge top-left */}
                      <div className="absolute top-2.5 left-2.5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-white/90 bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20">
                          <Eye className="w-3 h-3" />
                          <span>Citra Mata</span>
                        </div>
                      </div>
                      {/* Status bottom */}
                      <div className="absolute bottom-0 inset-x-0 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <p className="text-[8px] font-bold text-white/90 uppercase tracking-wider">Konjungtiva · Terdeteksi</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Nail/hand photo card (overlapping) */}
                  <motion.div
                    initial={{ opacity: 0, x: 20, rotate: 3 }}
                    animate={{ opacity: 1, x: 0, rotate: 3 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                    className="absolute -bottom-5 -right-4 sm:-right-8 z-20 bg-white rounded-2xl border border-white/60 shadow-xl shadow-navy-900/12 overflow-hidden w-[140px] sm:w-[160px]"
                  >
                    <div className="relative">
                      <img
                        src="/image/smartphone-health.jpg"
                        alt="Skrining via smartphone"
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
                      {/* Badge top-left */}
                      <div className="absolute top-2 left-2">
                        <div className="flex items-center gap-1 text-[8px] font-bold text-white/90 bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-white/20">
                          <Camera className="w-2.5 h-2.5" />
                          <span>Skrining HP</span>
                        </div>
                      </div>
                      {/* Status bottom */}
                      <div className="absolute bottom-0 inset-x-0 p-2">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                          <p className="text-[8px] font-bold text-white/90 uppercase tracking-wider">Via Browser</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* BloodDrop connecting badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="absolute -top-3 -left-3 z-30"
                  >
                    <div className="relative">
                      <BloodDropArt className="w-10 h-11" animate={false} />
                      <div className="absolute inset-0 flex items-center justify-center mt-1">
                        <span className="text-white text-[8px] font-extrabold">Hb</span>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============ STEP INDICATOR ============ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="mb-8"
        >
          <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-primary-600" />
              </div>
              <h3 className="text-sm font-bold text-navy-800">Alur Skrining</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  num: 1,
                  label: "Unggah Mata",
                  desc: "Foto konjungtiva",
                  icon: <Eye className="w-4 h-4" />,
                  done: !!eyeFile,
                },
                {
                  num: 2,
                  label: "Unggah Kuku",
                  desc: "Opsional, foto kuku",
                  icon: <NailIcon />,
                  done: !!nailFile,
                },
                {
                  num: 3,
                  label: "Analisis AI",
                  desc: "Proses otomatis",
                  icon: <ScanSearch className="w-4 h-4" />,
                  done: false,
                },
              ].map((step, i) => (
                <div key={i} className="relative flex items-center gap-3">
                  <motion.div
                    initial={{ scale: activeStep === i && !step.done ? 0.9 : 1 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-smooth ${
                      step.done
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                        : activeStep === i
                          ? "bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-sm shadow-primary-200"
                          : "bg-navy-50 text-navy-500 border border-navy-200"
                    }`}
                  >
                    {step.done ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </motion.div>
                  <div>
                    <p className={`text-sm font-bold ${
                      step.done
                        ? "text-emerald-700"
                        : activeStep === i
                          ? "text-primary-700"
                          : "text-navy-500"
                    }`}>
                      {step.label}
                    </p>
                    <p className="text-[11px] text-navy-500">{step.desc}</p>
                  </div>
                  {/* Connector arrow */}
                  {i < 2 && (
                    <div className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10">
                      <ChevronRight className={`w-4 h-4 transition-smooth ${
                        step.done ? "text-emerald-400" : "text-navy-200"
                      }`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ============ TIPS ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.16 }}
          className="mb-6"
        >
          <div className="bg-gradient-to-r from-primary-50/40 to-cyan-50/30 rounded-2xl border border-primary-100/40 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-primary-600" />
              <h3 className="text-xs font-bold text-primary-800 uppercase tracking-wider">Tips Kualitas Gambar</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.25, delay: 0.2 + i * 0.04 }}
                  className="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-sm border border-primary-100/40 text-primary-700 px-3 py-1.5 rounded-full text-[11px] font-medium shadow-sm"
                >
                  <span className="text-primary-500">{tip.icon}</span>
                  {tip.text}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ============ GENDER SELECTION ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6"
        >
          <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-800">Jenis Kelamin</h3>
                <p className="text-[11px] text-navy-500">Diperlukan untuk threshold WHO yang tepat</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "F", label: "Perempuan", icon: <Venus className="w-8 h-8 text-primary-500" />, threshold: "≥ 12.0 g/dL" },
                { key: "M", label: "Laki-laki", icon: <Mars className="w-8 h-8 text-primary-500" />, threshold: "≥ 13.0 g/dL" },
              ].map((opt) => (
                <motion.button
                  key={opt.key}
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setGender(opt.key)}
                  className={`relative flex flex-col items-center gap-2 px-4 py-4 rounded-2xl border-2 transition-smooth ${
                    gender === opt.key
                      ? "bg-gradient-to-b from-primary-50 to-white border-primary-500 shadow-md shadow-primary-500/8"
                      : "bg-white border-navy-200 text-navy-500 hover:border-navy-300"
                  }`}
                >
                  {gender === opt.key && (
                    <motion.div
                      layoutId="gender-active"
                      className="absolute inset-0 rounded-2xl border-2 border-primary-500"
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    />
                  )}
                  <span className="text-primary-500">{opt.icon}</span>
                  <span className={`text-sm font-bold ${gender === opt.key ? "text-primary-700" : "text-navy-600"}`}>
                    {opt.label}
                  </span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    gender === opt.key
                      ? "bg-primary-100 text-primary-600"
                      : "bg-navy-100 text-navy-500"
                  }`}>
                    Hb {opt.threshold}
                  </span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ============ UPLOAD SECTION ============ */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24 }}
          className="mb-6"
        >
          <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-800">Unggah Gambar</h3>
                <p className="text-[11px] text-navy-500">
                  {totalImages === 0 && "Unggah gambar mata untuk memulai skrining"}
                  {totalImages === 1 && eyeFile ? "Gambar mata siap — kuku opsional, bisa langsung analisis" : "1 gambar siap, tambah gambar kuku untuk hasil lebih akurat"}
                  {totalImages === 2 && "Kedua gambar siap untuk dianalisis. Kuku opsional, bukan wajib."}
                </p>
              </div>
              {totalImages > 0 && (
                <span className="ml-auto text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  {totalImages}/2 siap
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 relative">
              {/* Connection line (desktop) */}
              <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                <div className={`w-12 h-0.5 rounded-full transition-smooth ${
                  totalImages === 2
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : "bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200"
                }`} />
              </div>

              <UploadCard
                title="Gambar Mata / Konjungtiva"
                description="Unggah gambar yang jelas menunjukkan kelopak mata bawah atau konjungtiva."
                icon="eye"
                file={eyeFile}
                onFileSelect={setEyeFile}
                onFileRemove={() => setEyeFile(null)}
              />
              <div className="relative">
                <div className="absolute top-3 right-3 z-10">
                  <span className="text-[10px] font-bold text-primary-600 bg-primary-50 border border-primary-200 px-2 py-0.5 rounded-full">
                    Opsional
                  </span>
                </div>
                <UploadCard
                  title="Foto Tangan Penuh"
                  description="Unggah foto seluruh tangan dengan jari-jari terlihat jelas."
                  icon="nail"
                  file={nailFile}
                  onFileSelect={handleNailSelect}
                  onFileRemove={handleNailRemove}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============ BACKEND NOT CONNECTED ============ */}
        <BackendNotice
          state={backendOffline ? "offline" : backendState}
          retry={retryBackend}
        />

        {/* ============ ERROR ============ */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              className={
                backendOffline
                  ? "bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
                  : "bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
              }
            >
              <AlertCircle
                className={
                  backendOffline
                    ? "w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                    : "w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                }
              />
              <div>
                <p
                  className={
                    backendOffline ? "text-sm font-bold text-amber-800" : "text-sm font-bold text-red-800"
                  }
                >
                  {backendOffline ? "Server tidak dapat dihubungi" : "Analisis Gagal"}
                </p>
                <p className={backendOffline ? "text-sm text-amber-700 mt-1" : "text-sm text-red-600 mt-1"}>
                  {error}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============ NAIL RETRY PANEL ============ */}
        <AnimatePresence>
          {showRetry && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 rounded-xl p-2.5 flex-shrink-0">
                  <Hand className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">Foto kuku perlu diperjelas</p>
                  <p className="text-sm text-amber-700 mt-1">{retryError}</p>
                  <div className="text-xs text-amber-600 mt-2 space-y-1">
                    <p className="font-semibold">Tips foto kuku yang baik:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li>Jarak 15-20 cm, kuku menghadap kamera</li>
                      <li>Pencahayaan merata, hindari bayangan</li>
                      <li>Seluruh tangan terlihat dalam frame</li>
                      <li>Fokus tajam pada area kuku</li>
                    </ul>
                    <p className="mt-1">Atau tandai area kuku secara manual pada foto.</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-600/25 hover:-translate-y-0.5 active:scale-[0.98] transition-smooth"
                >
                  <Crosshair className="w-4 h-4" />
                  Tandai area kuku
                </button>
                <button
                  onClick={handleEyeOnly}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-navy-600 bg-white border border-navy-200 hover:bg-navy-50 transition-base"
                >
                  Lihat hasil mata saja
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ============ ANALYZE BUTTON ============ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
          className="mb-8"
        >
          <div className="relative">
            {/* Gradient mesh bg behind button */}
            {canAnalyze && (
              <div className="absolute -inset-3 bg-gradient-to-r from-primary-100/40 via-cyan-100/30 to-primary-100/40 rounded-2xl blur-xl pointer-events-none" />
            )}
            <div className="relative bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5 text-center">
              <button
                onClick={() => handleAnalyze()}
                disabled={!canAnalyze}
                className={`group w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-2xl font-bold shadow-lg transition-smooth text-sm hover:-translate-y-0.5 active:scale-[0.98] ${
                  canAnalyze
                    ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-primary-600/25 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl hover:shadow-primary-600/25"
                    : "bg-navy-100 text-navy-500 cursor-not-allowed shadow-none"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <ScanSearch className="w-5 h-5" />
                    Analisis Gambar
                    {canAnalyze && (
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </>
                )}
              </button>

              {canAnalyze && !loading && (
                <motion.p
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-primary-600 mt-3 flex items-center justify-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  {totalImages === 1
                    ? "Gambar mata siap dianalisis"
                    : "Kedua gambar siap dianalisis"}
                  {nailBox && " (area kuku sudah ditandai)"}
                </motion.p>
              )}

              {!canAnalyze && !loading && (
                <p className="text-xs text-navy-500 mt-2">
                  Unggah gambar mata untuk mengaktifkan tombol analisis
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* ============ DISCLAIMER ============ */}
        <Disclaimer />

        {/* ============ PRIVACY ============ */}
        <div className="mt-5 text-center">
          <p className="text-xs text-navy-500 max-w-lg mx-auto">
            Gambar yang diunggah hanya digunakan untuk analisis selama sesi skrining saat ini
            kecuali ada persetujuan eksplisit untuk penyimpanan.
          </p>
        </div>
      </div>

      {/* ============ FULL-SCREEN LOADING OVERLAY ============ */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-md" />

            {/* Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative glass-strong rounded-3xl border border-white/60 shadow-2xl p-8 sm:p-10 max-w-md w-[90%]"
            >
              {/* Glow */}
              <div className="absolute -inset-8 bg-gradient-to-tr from-primary-400/15 via-primary-300/8 to-cyan-300/15 rounded-[3rem] blur-2xl pointer-events-none" />

              <div className="relative">
                {/* Eye ↔ Nail animation */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <motion.div
                    animate={{
                      scale: loadingStep >= 1 ? [1, 1.06, 1] : 0.88,
                      opacity: loadingStep >= 1 ? 1 : 0.3,
                    }}
                    transition={{ duration: 0.4 }}
                  >
                    <EyeArt className="w-20 h-20 sm:w-24 sm:h-24" animate={false} />
                  </motion.div>

                  {nailFile && (
                    <>
                      <div className="flex flex-col items-center gap-1">
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30"
                        >
                          <Loader2 className="w-4 h-4 text-white animate-spin" />
                        </motion.div>
                        <motion.div
                          className="w-0.5 h-6 bg-gradient-to-b from-primary-400 to-transparent"
                          animate={{ scaleY: [0.5, 1, 0.5] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                        />
                      </div>

                      <motion.div
                        animate={{
                          scale: loadingStep >= 2 ? [1, 1.06, 1] : 0.88,
                          opacity: loadingStep >= 2 ? 1 : 0.3,
                        }}
                        transition={{ duration: 0.4 }}
                      >
                        <NailArt className="w-20 h-20 sm:w-24 sm:h-24" animate={false} />
                      </motion.div>
                    </>
                  )}

                  {!nailFile && (
                    <motion.div
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30"
                    >
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                    </motion.div>
                  )}
                </div>

                {/* BloodDrop result hint */}
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="flex justify-center mb-6"
                >
                  <div className="relative">
                    <BloodDropArt className="w-14 h-16" animate={false} />
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <span className="text-white text-[10px] font-bold">Hb</span>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Status text */}
                <motion.p
                  key={loadingStep}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-sm font-bold text-navy-800 mb-6"
                >
                  {loadingSteps[loadingStep].label}...
                </motion.p>

                {/* Steps */}
                <div className="space-y-1.5">
                  {loadingSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-smooth ${
                        i === loadingStep
                          ? "bg-primary-50 text-primary-700 border border-primary-100"
                          : i < loadingStep
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "text-navy-300 border border-transparent"
                      }`}
                    >
                      {i < loadingStep ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </motion.div>
                      ) : i === loadingStep ? (
                        <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-navy-200" />
                      )}
                      <span className="text-xs font-medium">{step.label}</span>
                      <span className="ml-auto text-[10px]">{step.icon}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-5 h-1.5 w-full bg-navy-100 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 rounded-full"
                    animate={{
                      width: `${((loadingStep + 1) / loadingSteps.length) * 100}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ NAIL CROP MODAL ============ */}
      <AnimatePresence>
        {showCrop && nailFile && (
          <NailBoxCrop
            file={nailFile}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function NailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
