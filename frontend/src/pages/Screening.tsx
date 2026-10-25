import { useState, useCallback, useRef, type ReactNode } from "react";
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
  SlidersHorizontal,
  Check,
} from "lucide-react";
import UploadCard from "@/components/UploadCard";
import Disclaimer from "@/components/Disclaimer";
import EyeArt from "@/components/EyeArt";
import { slimPrediction } from "@/lib/utils";
import NailArt from "@/components/NailArt";
import BloodDropArt from "@/components/BloodDropArt";
import NailBoxCrop, { type NailBox } from "@/components/NailBoxCrop";
import { analyzeImages, BackendUnreachableError, ApiRejectionError } from "@/services/api";
import BackendNotice from "@/components/BackendNotice";
import { useBackendStatus } from "@/hooks/useBackendStatus";
import type { PredictionResult } from "@/types/prediction";

const tips = [
  { icon: <Sun className="w-3.5 h-3.5" />, text: "Pencahayaan baik" },
  { icon: <Ban className="w-3.5 h-3.5" />, text: "Hindari bayangan" },
  { icon: <SlidersHorizontal className="w-3.5 h-3.5" />, text: "Tanpa filter" },
  { icon: <Focus className="w-3.5 h-3.5" />, text: "Gambar fokus" },
  { icon: <Crosshair className="w-3.5 h-3.5" />, text: "Area tepat sasaran" },
  { icon: <Eye className="w-3.5 h-3.5" />, text: "Tidak buram" },
];

export default function Screening() {
  const [eyeFile, setEyeFile] = useState<File | null>(null);
  const [nailFile, setNailFile] = useState<File | null>(null);
  // No silent default: the model shifts Hb by ~1.75 g/dL between sexes for the
  // same image, so an unremembered default produced different results across
  // sessions. Restore the last explicit choice, otherwise require one.
  const [gender, setGender] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("anevision.gender.v2");
      return saved === "M" || saved === "F" ? saved : "";
    } catch {
      return "";
    }
  });
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
  const backend = useBackendStatus();
  const [backendOffline, setBackendOffline] = useState(false);

  const activeStep = !eyeFile ? 0 : !nailFile ? 1 : 2;
  // Analysis needs the API: firing it while the backend is known-down only
  // produces a proxy error, so the button stays off until /health answers.
  const canAnalyze =
    eyeFile !== null && gender !== "" && !loading && backend.state === "online";

  // Set when a request failed on connectivity. Displayed as an offline notice
  // only while the health probe has not recovered yet — derived during render,
  // so a green probe clears it without needing an effect to write state.
  const forcedOffline = backendOffline && backend.state !== "online";

  const totalImages = (eyeFile ? 1 : 0) + (nailFile ? 1 : 0);

  const uploadHint =
    totalImages === 0
      ? "Unggah gambar mata dan foto kuku untuk memulai skrining"
      : totalImages === 2
        ? "Kedua gambar siap dianalisis"
        : eyeFile
          ? "Gambar mata siap. Tambahkan foto kuku untuk hasil yang lebih lengkap."
          : "Foto kuku siap. Tambahkan gambar mata untuk melanjutkan.";

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

  // The running step can briefly exceed the list when the nail photo is
  // removed mid-run (eye-only rerun), so the overlay renders a clamped index.
  const shownStep = Math.min(loadingStep, loadingSteps.length - 1);
  const progressPct = Math.round(((shownStep + 1) / loadingSteps.length) * 100);

  const handleAnalyze = useCallback(
    async (overrideBox?: NailBox, options?: { eyeOnly?: boolean }) => {
      if (!eyeFile) return;
      if (!gender) return;
      setLoading(true);
      setError(null);
      setShowRetry(false);

      const box = overrideBox !== undefined ? overrideBox : nailBoxRef.current;
      const nailToSend = options?.eyeOnly ? null : nailFile;
      // Must match the loadingSteps array rendered for this run: the overlay
      // re-renders from state (nailFile cleared on eyeOnly), so the interval
      // can never step past the end of the displayed list.
      const stepsCount = nailToSend ? 4 : 3;

      const startTime = Date.now();
      const MIN_LOADING_MS = 3000;

      let stepIndex = 0;
      const stepInterval = setInterval(() => {
        stepIndex = (stepIndex + 1) % stepsCount;
        setLoadingStep(stepIndex);
      }, 2000);
      setLoadingStep(0);

      try {
        const result = await analyzeImages(eyeFile, nailToSend, gender, box);

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
        } else if (err instanceof ApiRejectionError && err.code === "invalid_nail_image") {
          // The backend rejected the nail photo (not a hand/nail, undetected,
          // or unusable). Whole analysis is halted: offer the recovery panel
          // instead of the generic error banner.
          setPendingResult(null);
          setRetryError(err.message);
          setShowRetry(true);
        } else {
          setError(
            err.message || "Kami tidak dapat menganalisis gambar. Pastikan gambar jelas dan coba lagi."
          );
        }
      } finally {
        setLoading(false);
      }
    },
    [eyeFile, nailFile, gender, navigate]
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

  // Recovery after a hard rejection (HTTP 400): the nail photo itself is the
  // problem, so it is removed explicitly and the screening reruns eye-only.
  const handleDropNail = useCallback(() => {
    handleNailRemove();
    setRetryError(null);
    setPendingResult(null);
    handleAnalyze(undefined, { eyeOnly: true });
  }, [handleNailRemove, handleAnalyze]);

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
          <div className="relative bg-white rounded-3xl border border-navy-100/70 shadow-[0_24px_70px_-34px_rgba(16,42,67,0.28)] overflow-hidden">
            {/* Gradient mesh bg */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-50/60 via-white to-cyan-50/40 pointer-events-none" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary-100/35 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-cyan-100/30 rounded-full blur-3xl pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-5 gap-7 p-6 sm:p-8 lg:p-10 items-center">
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
                  Unggah gambar mata dan kuku untuk mendapatkan estimasi kadar hemoglobin
                  berbasis AI. Cepat, non-invasif, dan sepenuhnya melalui browser.
                </p>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  {[
                    { icon: <Shield className="w-3.5 h-3.5" />, label: "Non-invasif" },
                    { icon: <Zap className="w-3.5 h-3.5" />, label: "Hasil dalam detik" },
                    { icon: <Camera className="w-3.5 h-3.5" />, label: "Via kamera ponsel" },
                  ].map(({ icon, label }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-navy-100/80 bg-white/80 px-3 py-1.5 text-xs font-semibold text-navy-600 backdrop-blur-sm"
                    >
                      <span className="text-primary-500">{icon}</span>
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Right: photo cards */}
              <div className="lg:col-span-2 flex items-center justify-center">
                <div className="relative w-[280px] sm:w-[320px]">
                  {/* Eye photo card */}
                  <motion.div
                    initial={{ opacity: 0, x: 20, rotate: -3 }}
                    animate={{ opacity: 1, x: 0, rotate: -3 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="relative z-10 bg-white rounded-2xl border border-white/70 ring-1 ring-navy-900/5 shadow-xl shadow-navy-900/15 overflow-hidden w-[176px] sm:w-[200px]"
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
                        <div className="flex items-center gap-1 text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/25">
                          <Eye className="w-3.5 h-3.5" />
                          <span>Citra Mata</span>
                        </div>
                      </div>
                      {/* Status bottom */}
                      <div className="absolute bottom-0 inset-x-0 p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <p className="text-[9px] font-bold text-white/95 uppercase tracking-wider">Konjungtiva · Terdeteksi</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Nail/hand photo card (overlapping) */}
                  <motion.div
                    initial={{ opacity: 0, x: 20, rotate: 3 }}
                    animate={{ opacity: 1, x: 0, rotate: 3 }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                    className="absolute -bottom-5 -right-3 sm:-right-8 z-20 bg-white rounded-2xl border border-white/70 ring-1 ring-navy-900/5 shadow-xl shadow-navy-900/15 overflow-hidden w-[138px] sm:w-[160px]"
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
                      <div className="absolute top-2.5 left-2.5">
                        <div className="flex items-center gap-1 text-[9px] font-bold text-white bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full border border-white/25">
                          <Camera className="w-3 h-3" />
                          <span>Skrining HP</span>
                        </div>
                      </div>
                      {/* Status bottom */}
                      <div className="absolute bottom-0 inset-x-0 p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                          <p className="text-[9px] font-bold text-white/95 uppercase tracking-wider">Via Browser</p>
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
                        <span className="text-white text-[9px] font-extrabold">Hb</span>
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
          className="mb-6"
        >
          <div className="panel p-5 sm:p-6">
            <PanelHeader
              icon={<ListChecks className="w-5 h-5" />}
              title="Alur Skrining"
              subtitle="Tiga langkah singkat, hasil langsung di browser."
            />

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
                  desc: "Disarankan",
                  icon: <Hand className="w-4 h-4" />,
                  done: !!nailFile,
                },
                {
                  num: 3,
                  label: "Analisis AI",
                  desc: "Proses otomatis",
                  icon: <ScanSearch className="w-4 h-4" />,
                  done: false,
                },
              ].map((step, i) => {
                const isActive = activeStep === i && !step.done;
                return (
                  <div key={i} className="relative flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0.92 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.25 }}
                      className={`flex-shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold transition-smooth ${
                        step.done
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                          : isActive
                            ? "bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-500/25 ring-4 ring-primary-100/70"
                            : "bg-white text-navy-500 border border-navy-200"
                      }`}
                    >
                      {step.done ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        step.icon
                      )}
                    </motion.div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${
                        step.done
                          ? "text-emerald-700"
                          : isActive
                            ? "text-primary-700"
                            : "text-navy-500"
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-navy-500">{step.desc}</p>
                    </div>
                    {i < 2 && (
                      <div className="hidden sm:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                        <ChevronRight className={`w-4 h-4 ${
                          step.done ? "text-emerald-400" : "text-navy-200"
                        }`} />
                      </div>
                    )}
                  </div>
                );
              })}
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
          <div className="panel overflow-hidden">
            <div className="flex items-center gap-3 border-b border-navy-100/60 bg-gradient-to-r from-primary-50/50 to-cyan-50/30 px-5 py-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 ring-1 ring-primary-100">
                <Lightbulb className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy-900">Tips Kualitas Gambar</h3>
                <p className="text-xs text-navy-500">Agar hasil analisis lebih akurat.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-6">
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.2 + i * 0.04 }}
                  className="flex items-center gap-2 rounded-xl border border-navy-100/70 bg-navy-50/40 px-3 py-2.5 text-xs font-semibold text-navy-600"
                >
                  <span className="text-primary-600">{tip.icon}</span>
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
          <div className="panel p-5 sm:p-6">
            <PanelHeader
              index="01"
              icon={<User className="w-5 h-5" />}
              title="Jenis Kelamin"
              subtitle="Diperlukan untuk threshold WHO yang tepat."
            />

            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "F", label: "Perempuan", icon: <Venus className="w-7 h-7" />, threshold: "≥ 12.0 g/dL" },
                { key: "M", label: "Laki-laki", icon: <Mars className="w-7 h-7" />, threshold: "≥ 13.0 g/dL" },
              ].map((opt) => {
                const selected = gender === opt.key;
                return (
                  <motion.button
                    key={opt.key}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    aria-pressed={selected}
                    onClick={() => {
                      setGender(opt.key);
                      try {
                        localStorage.setItem("anevision.gender.v2", opt.key);
                      } catch {
                        // storage unavailable (private mode): selection still works this session
                      }
                    }}
                    className={`relative flex flex-col items-center gap-2.5 px-4 py-5 rounded-2xl border-2 text-center transition-smooth ${
                      selected
                        ? "bg-gradient-to-b from-primary-50 to-white border-primary-500 shadow-md shadow-primary-500/10"
                        : "bg-white border-navy-200 text-navy-500 hover:border-primary-200 hover:bg-primary-50/20"
                    }`}
                  >
                    {selected && (
                      <>
                        <motion.div
                          layoutId="gender-active"
                          className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-primary-500"
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        />
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.45 }}
                          className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm"
                        >
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </motion.span>
                      </>
                    )}
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 transition-smooth ${
                        selected
                          ? "bg-white text-primary-600 ring-primary-200"
                          : "bg-navy-50 text-navy-500 ring-navy-100"
                      }`}
                    >
                      {opt.icon}
                    </span>
                    <span className={`text-sm font-bold ${selected ? "text-primary-700" : "text-navy-700"}`}>
                      {opt.label}
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      selected
                        ? "bg-primary-100 text-primary-700"
                        : "bg-navy-100/70 text-navy-500"
                    }`}>
                      Hb {opt.threshold}
                    </span>
                  </motion.button>
                );
              })}
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
          <div className="panel p-5 sm:p-6">
            <PanelHeader
              index="02"
              icon={<Camera className="w-5 h-5" />}
              title="Unggah Gambar"
              subtitle={uploadHint}
              right={
                totalImages > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {totalImages}/2 siap
                  </span>
                ) : null
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 relative">
              {/* Connection line (desktop) */}
              <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0">
                <div className={`w-12 h-0.5 rounded-full transition-smooth ${
                  totalImages === 2
                    ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    : "bg-gradient-to-r from-primary-200 via-primary-400 to-primary-200"
                }`} />
              </div>

              <div className="relative">
                <UploadCard
                  title="Gambar Mata / Konjungtiva"
                  description="Unggah gambar yang jelas menunjukkan kelopak mata bawah atau konjungtiva."
                  icon="eye"
                  tag={{ label: "Wajib", tone: "required" }}
                  file={eyeFile}
                  onFileSelect={setEyeFile}
                  onFileRemove={() => setEyeFile(null)}
                />
              </div>
              <div className="relative">
                <UploadCard
                  title="Foto Tangan Penuh"
                  description="Unggah foto seluruh tangan dengan jari-jari terlihat jelas untuk perbandingan kuku."
                  icon="nail"
                  tag={{ label: "Disarankan", tone: "recommended" }}
                  file={nailFile}
                  onFileSelect={handleNailSelect}
                  onFileRemove={handleNailRemove}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* ============ BACKEND STATUS ============ */}
        {forcedOffline ? (
          <BackendNotice status={{ ...backend, state: "offline" }} />
        ) : (
          <BackendNotice status={backend} />
        )}

        {/* ============ ERROR ============ */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4 }}
              role="alert"
              aria-live="polite"
              className={
                forcedOffline
                  ? "bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
                  : "bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3"
              }
            >
              <AlertCircle
                className={
                  forcedOffline
                    ? "w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
                    : "w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                }
              />
              <div>
                <p
                  className={
                    forcedOffline ? "text-sm font-bold text-amber-800" : "text-sm font-bold text-red-800"
                  }
                >
                  {forcedOffline ? "Server tidak dapat dihubungi" : "Analisis Gagal"}
                </p>
                <p className={forcedOffline ? "text-sm text-amber-700 mt-1" : "text-sm text-red-600 mt-1"}>
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
              role="alert"
              aria-live="polite"
              className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6"
            >
              <div className="flex items-start gap-3">
                <div className="bg-amber-100 rounded-xl p-2.5 flex-shrink-0">
                  <Hand className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">
                    {pendingResult ? "Foto kuku perlu diperjelas" : "Foto kuku ditolak"}
                  </p>
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
                {pendingResult ? (
                  <button
                    onClick={handleEyeOnly}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-navy-600 bg-white border border-navy-200 hover:bg-navy-50 transition-base"
                  >
                    Lihat hasil mata saja
                  </button>
                ) : (
                  <button
                    onClick={handleDropNail}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-navy-600 bg-white border border-navy-200 hover:bg-navy-50 transition-base"
                  >
                    Hapus foto kuku & lanjut
                  </button>
                )}
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
              <div className="absolute -inset-2 rounded-[1.4rem] bg-gradient-to-r from-primary-200/40 via-cyan-200/30 to-primary-200/40 blur-xl pointer-events-none" />
            )}
            <div className="panel panel-accent relative overflow-hidden p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
                <ReadinessPill done={gender !== ""} label="Jenis kelamin" />
                <ReadinessPill done={!!eyeFile} label="Gambar mata" />
                <ReadinessPill done={!!nailFile} label="Foto kuku" />
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={!canAnalyze}
                  aria-busy={loading}
                  className={`group inline-flex w-full items-center justify-center gap-2.5 rounded-2xl px-10 py-4 text-sm font-bold shadow-lg transition-smooth hover:-translate-y-0.5 active:scale-[0.98] sm:w-auto ${
                    canAnalyze
                      ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-primary-600/25 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl hover:shadow-primary-600/25"
                      : "cursor-not-allowed bg-navy-100 text-navy-500 shadow-none"
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
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-600"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    {nailFile ? "Gambar mata + kuku siap dianalisis" : "Gambar mata siap dianalisis"}
                    {nailBox && " (area kuku sudah ditandai)"}
                  </motion.p>
                )}

                {!canAnalyze && !loading && !eyeFile && (
                  <p className="mt-3 text-xs text-navy-500">
                    Unggah gambar mata untuk mengaktifkan tombol analisis.
                  </p>
                )}

                {!canAnalyze && !loading && eyeFile && !gender && (
                  <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Pilih jenis kelamin dahulu agar threshold WHO tepat.
                  </motion.p>
                )}

                {!canAnalyze && !loading && eyeFile && backend.state !== "online" && (
                  <p className="mt-3 text-xs text-navy-500">
                    {backend.state === "offline"
                      ? "Server analisis belum tersedia. Tekan 'Coba lagi' pada notifikasi di atas, lalu ulangi."
                      : "Menunggu server analisis merespons, tunggu sebentar…"}
                  </p>
                )}
              </div>
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
                <motion.div
                  key={loadingStep}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-5 text-center"
                >
                  <p className="text-sm font-bold text-navy-900">{loadingSteps[shownStep].label}...</p>
                  <p className="mt-1 text-[11px] font-medium text-navy-500">
                    Langkah {shownStep + 1} dari {loadingSteps.length}
                  </p>
                </motion.div>

                {/* Steps */}
                <div className="space-y-1.5">
                  {loadingSteps.map((step, i) => (
                    <motion.div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-smooth ${
                        i === shownStep
                          ? "bg-primary-50 text-primary-700 border border-primary-100"
                          : i < shownStep
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "text-navy-300 border border-transparent"
                      }`}
                    >
                      {i < shownStep ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </motion.div>
                      ) : i === shownStep ? (
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
                <div className="mt-5 flex items-center justify-between text-[11px] font-semibold text-navy-500">
                  <span>Progres analisis</span>
                  <span className="tabular-nums text-primary-600">{progressPct}%</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"
                    animate={{ width: `${progressPct}%` }}
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

function PanelHeader({
  index,
  icon,
  title,
  subtitle,
  right,
}: {
  index?: string;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 ring-1 ring-primary-100/80">
        {icon}
        {index && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-900 px-1 text-[9px] font-bold leading-none text-white">
            {index}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-bold leading-snug text-navy-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-navy-500">{subtitle}</p>}
      </div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}

function ReadinessPill({ done, label }: { done: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition-smooth ${
        done
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-navy-200 bg-navy-50/60 text-navy-500"
      }`}
    >
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-navy-300" />
      )}
      {label}
    </span>
  );
}
