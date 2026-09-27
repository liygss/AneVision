import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  Upload,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Cpu,
  FileImage,
  Activity,
  Eye,
  Hand,
  Microscope,
  BarChart3,
} from "lucide-react";
import EyeArt from "./EyeArt";
import NailArt from "./NailArt";
import BloodDropArt from "./BloodDropArt";
import AnimatedCounter from "./AnimatedCounter";

const PHASE_LABELS = ["Unggah Mata", "Unggah Kuku", "Analisis", "Hasil"];
const PHASE_ICONS = [
  <Eye key="eye" className="w-4 h-4" />,
  <Hand key="hand" className="w-4 h-4" />,
  <Microscope key="mic" className="w-4 h-4" />,
  <BarChart3 key="chart" className="w-4 h-4" />,
];

const ANALYZE_STEPS = [
  "Mempersiapkan gambar",
  "Menganalisis gambar mata",
  "Menganalisis gambar kuku",
  "Menghasilkan hasil skrining",
];

const PHASE_DURATIONS = [2200, 2200, 3600, 4000] as const;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

export default function ScreeningDemo() {
  const [phase, setPhase] = useState(-1);
  const [prevPhase, setPrevPhase] = useState(-1);
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [done, setDone] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { amount: 0.3 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const startSequence = useCallback(() => {
    clearAll();
    setPhase(-1);
    setPrevPhase(-1);
    setAnalyzeStep(0);
    setDone(false);

    timers.current.push(
      setTimeout(() => {
        setPhase(0);
        setPrevPhase(0);
      }, 400)
    );

    let t = 400 + PHASE_DURATIONS[0];
    timers.current.push(
      setTimeout(() => {
        setPrevPhase(1);
        setPhase(1);
      }, t)
    );
    t += PHASE_DURATIONS[1];
    timers.current.push(
      setTimeout(() => {
        setPrevPhase(2);
        setPhase(2);
      }, t)
    );

    timers.current.push(
      setTimeout(() => setAnalyzeStep(1), t + 900)
    );
    timers.current.push(
      setTimeout(() => setAnalyzeStep(2), t + 1800)
    );
    timers.current.push(
      setTimeout(() => setAnalyzeStep(3), t + 2700)
    );

    t += PHASE_DURATIONS[2];
    timers.current.push(
      setTimeout(() => {
        setPrevPhase(3);
        setPhase(3);
      }, t)
    );

    t += PHASE_DURATIONS[3];
    timers.current.push(
      setTimeout(() => setDone(true), t)
    );
  }, [clearAll]);

  useEffect(() => {
    if (inView && phase === -1 && !done) {
      const id = setTimeout(startSequence, 200);
      timers.current.push(id);
      return () => clearTimeout(id);
    }
  }, [inView, phase, done, startSequence]);

  useEffect(() => clearAll, [clearAll]);

  const replay = () => {
    startSequence();
  };

  const progressPercent =
    phase >= 0
      ? Math.min(
          ((phase / (PHASE_LABELS.length - 1)) * 100 +
            (phase === 2 ? (analyzeStep / ANALYZE_STEPS.length) * (100 / (PHASE_LABELS.length - 1)) : 0)),
          100
        )
      : 0;

  const direction = phase >= prevPhase ? 1 : -1;

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      {/* Glow behind panel */}
      <div className="absolute -inset-4 sm:-inset-8 bg-gradient-to-tr from-primary-200/30 via-primary-100/20 to-cyan-200/20 rounded-[2.5rem] blur-2xl pointer-events-none" />

      {/* Main panel */}
      <div className="relative glass-strong rounded-3xl border border-white/70 shadow-2xl shadow-navy-900/10 overflow-hidden">
        {/* Top progress bar */}
        <div className="h-1 w-full bg-navy-100/60">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600"
            initial={{ width: "0%" }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="p-3.5 sm:p-4 md:p-5">
          {/* Window chrome */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img
                src="/image/AneVision_logo.png"
                alt="Logo"
                className="w-7 h-7 object-cover rounded-lg"
              />
              <div>
                <p className="text-xs font-bold text-navy-900 leading-none">
                  anevision
                </p>
                <p className="text-[9px] text-navy-500 mt-0.5">Skrining AI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Current phase label */}
              <AnimatePresence mode="wait">
                {phase >= 0 && (
                  <motion.span
                    key={phase}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-100 hidden sm:inline-flex items-center gap-1"
                  >
                    <span>{PHASE_ICONS[phase]}</span>
                    {PHASE_LABELS[phase]}
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-300" />
                <span className="w-2 h-2 rounded-full bg-amber-300" />
                <span className="w-2 h-2 rounded-full bg-emerald-300" />
              </div>
            </div>
          </div>

          {/* Demo body */}
          <div className="relative min-h-[380px] sm:min-h-[420px] flex items-center justify-center p-2 overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {/* Phase 0: Unggah Mata */}
              {phase === 0 && (
                <motion.div
                  key="phase-0"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full"
                >
                  <PhaseTitle icon={<Eye className="w-4 h-4" />} title="Langkah 1: Unggah Gambar Mata" />

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Eye slot — file dropping */}
                    <div className="relative rounded-2xl border-2 border-dashed border-primary-300 bg-gradient-to-b from-primary-50/80 to-white p-3 overflow-hidden">
                      <div className="absolute inset-0 bg-primary-400/5 animate-shimmer pointer-events-none" />
                      <div className="flex items-center justify-between mb-2 relative">
                        <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wide">
                          Citra Mata
                        </span>
                      </div>
                      <div className="relative h-28 sm:h-32 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-dashed border-primary-200 rounded-xl flex flex-col items-center justify-center text-primary-300">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[9px]">Tarik file ke sini</span>
                        </div>
                        <motion.div
                          initial={{ y: -80, opacity: 0, scale: 0.6, rotate: -8 }}
                          animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.5,
                            type: "spring",
                            bounce: 0.35,
                          }}
                          className="relative z-10"
                        >
                          <div className="bg-white rounded-xl border border-primary-200 shadow-xl shadow-primary-200/30 px-3 py-2.5 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                              <FileImage className="w-4 h-4 text-primary-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-navy-700 leading-none">
                                foto-mata.jpg
                              </p>
                              <p className="text-[8px] text-navy-500 mt-0.5">
                                2.4 MB
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </div>

                    {/* Nail slot — empty */}
                    <div className="rounded-2xl border border-navy-100 bg-navy-50/40 p-3 flex flex-col items-center justify-center opacity-60">
                      <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center mb-2">
                        <Upload className="w-4 h-4 text-navy-300" />
                      </div>
                      <p className="text-[9px] text-navy-300 font-medium">
                        Belum terunggah
                      </p>
                    </div>
                  </div>

                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-navy-100 text-navy-300 text-xs font-bold cursor-not-allowed"
                  >
                    Analisis Gambar
                  </button>
                </motion.div>
              )}

              {/* Phase 1: Unggah Kuku */}
              {phase === 1 && (
                <motion.div
                  key="phase-1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full"
                >
                  <PhaseTitle icon={<Hand className="w-4 h-4" />} title="Langkah 2: Unggah Gambar Kuku" />

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Eye slot — uploaded */}
                    <div className="relative rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white p-3 overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                          Citra Mata
                        </span>
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", bounce: 0.5 }}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </motion.div>
                      </div>
                      <div className="h-28 sm:h-32 flex items-center justify-center">
                        <EyeArt className="w-full h-full" animate={false} />
                      </div>
                      <p className="mt-1 text-[9px] text-emerald-600 text-center font-medium">
                        Konjungtiva · Terdeteksi ✓
                      </p>
                    </div>

                    {/* Nail slot — file dropping */}
                    <div className="relative rounded-2xl border-2 border-dashed border-primary-300 bg-gradient-to-b from-primary-50/80 to-white p-3 overflow-hidden">
                      <div className="absolute inset-0 bg-primary-400/5 animate-shimmer pointer-events-none" />
                      <div className="flex items-center justify-between mb-2 relative">
                        <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wide">
                          Citra Kuku
                        </span>
                      </div>
                      <div className="relative h-28 sm:h-32 flex items-center justify-center">
                        <div className="absolute inset-0 border-2 border-dashed border-primary-200 rounded-xl flex flex-col items-center justify-center text-primary-300">
                          <Upload className="w-5 h-5 mb-1" />
                          <span className="text-[9px]">Tarik file ke sini</span>
                        </div>
                        <motion.div
                          initial={{ y: -80, opacity: 0, scale: 0.6, rotate: 8 }}
                          animate={{ y: 0, opacity: 1, scale: 1, rotate: 0 }}
                          transition={{
                            duration: 0.6,
                            delay: 0.4,
                            type: "spring",
                            bounce: 0.35,
                          }}
                          className="relative z-10"
                        >
                          <div className="bg-white rounded-xl border border-primary-200 shadow-xl shadow-primary-200/30 px-3 py-2.5 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
                              <FileImage className="w-4 h-4 text-primary-500" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-navy-700 leading-none">
                                foto-kuku.jpg
                              </p>
                              <p className="text-[8px] text-navy-500 mt-0.5">
                                1.8 MB
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-navy-100 text-navy-300 text-xs font-bold cursor-not-allowed"
                  >
                    Analisis Gambar
                  </button>
                </motion.div>
              )}

              {/* Phase 2: Analisis AI */}
              {phase === 2 && (
                <motion.div
                  key="phase-2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="w-full"
                >
                  <PhaseTitle icon={<Microscope className="w-4 h-4" />} title="Langkah 3: Analisis AI" />

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Eye slot — scanning */}
                    <div className="relative rounded-2xl border border-primary-200 bg-gradient-to-b from-primary-50/60 to-white p-3 overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wide">
                          Citra Mata
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="relative h-28 sm:h-32 flex items-center justify-center overflow-hidden rounded-xl">
                        <EyeArt className="w-full h-full" animate={false} />
                      </div>
                      <p className="mt-1 text-[9px] text-navy-500 text-center">
                        Konjungtiva · Terdeteksi
                      </p>
                    </div>

                    {/* Nail slot — scanning */}
                    <div className="relative rounded-2xl border border-primary-200 bg-gradient-to-b from-primary-50/60 to-white p-3 overflow-hidden">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-primary-700 uppercase tracking-wide">
                          Citra Kuku
                        </span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      </div>
                      <div className="relative h-28 sm:h-32 flex items-center justify-center overflow-hidden rounded-xl">
                        <NailArt className="w-full h-full" animate={false} />
                      </div>
                      <p className="mt-1 text-[9px] text-navy-500 text-center">
                        Tempat Kuku · Terdeteksi
                      </p>
                    </div>
                  </div>

                  {/* Analyze button active */}
                  <motion.div
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white text-xs font-bold mb-4 shadow-lg shadow-primary-500/20"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Menganalisis kedua citra...
                  </motion.div>

                  {/* Progress checklist */}
                  <div className="bg-white rounded-xl border border-navy-100 p-3 shadow-sm">
                    <div className="space-y-1.5">
                      {ANALYZE_STEPS.map((label, i) => (
                        <motion.div
                          key={i}
                          initial={false}
                          animate={{
                            backgroundColor:
                              i === analyzeStep
                                ? "rgba(8,145,178,0.08)"
                                : i < analyzeStep
                                  ? "rgba(16,185,129,0.08)"
                                  : "transparent",
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium"
                        >
                          {i < analyzeStep ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", bounce: 0.5 }}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            </motion.div>
                          ) : i === analyzeStep ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600 flex-shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-navy-200 flex-shrink-0" />
                          )}
                          <span
                            className={
                              i === analyzeStep
                                ? "text-primary-700"
                                : i < analyzeStep
                                  ? "text-emerald-700"
                                  : "text-navy-300"
                            }
                          >
                            {label}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-3 h-1.5 w-full bg-navy-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                        initial={{ width: "0%" }}
                        animate={{
                          width: `${((analyzeStep + 1) / ANALYZE_STEPS.length) * 100}%`,
                        }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Phase 3: Hasil */}
              {phase === 3 && (
                <motion.div
                  key="phase-3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="w-full"
                >
                  <PhaseTitle icon={<BarChart3 className="w-4 h-4" />} title="Langkah 4: Hasil Skrining" />

                  {/* Result card with glow */}
                  <div className="relative rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-primary-50 p-4 mb-4 shadow-lg shadow-emerald-100/50 overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-200/30 rounded-full blur-2xl" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <BloodDropArt className="w-16 h-16" animate={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-navy-500 uppercase tracking-wider">
                          Estimasi Hemoglobin AI
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <AnimatedCounter
                            value={11.2}
                            decimals={1}
                            className="text-3xl sm:text-4xl font-extrabold text-navy-900 tracking-tight"
                          />
                          <span className="text-sm font-bold text-navy-500">
                            g/dL
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.3, type: "spring" }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Risiko Sedang
                          </motion.span>
                          <motion.span
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.45, type: "spring" }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200"
                          >
                            <Cpu className="w-3 h-3" />
                            AI: 84%
                          </motion.span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confidence bars */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Model Mata", value: 86, color: "from-cyan-400 to-primary-600" },
                      { label: "Model Kuku", value: 81, color: "from-primary-400 to-primary-700" },
                    ].map((m, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 + i * 0.15 }}
                        className="rounded-xl border border-navy-100 bg-white p-3 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-bold text-navy-500">
                            {m.label}
                          </p>
                          <span className="text-[10px] font-extrabold text-navy-900">
                            {m.value}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-navy-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${m.color} rounded-full`}
                            initial={{ width: 0 }}
                            animate={{ width: `${m.value}%` }}
                            transition={{ duration: 1, delay: 0.4 + i * 0.15, ease: "easeOut" }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Idle state */}
            {phase === -1 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
                    <Activity className="w-7 h-7 text-primary-500" />
                  </div>
                  <div className="absolute -inset-2 bg-primary-200/20 rounded-2xl blur-lg" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-navy-700 mb-1">
                    Demo Anevision
                  </p>
                  <p className="text-xs text-navy-500">
                    Simulasi skrining akan dimulai...
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Bottom: progress dots + replay */}
          <div className="flex items-center justify-between mt-1 px-1 pb-1">
            <div className="flex items-center gap-2.5">
              {PHASE_LABELS.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      i === phase
                        ? "bg-primary-500 scale-125 shadow-sm shadow-primary-300"
                        : i < phase
                          ? "bg-emerald-400"
                          : "bg-navy-200"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors hidden sm:inline ${
                      i === phase
                        ? "text-primary-700"
                        : i < phase
                          ? "text-emerald-600"
                          : "text-navy-300"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {(done || phase === -1) && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={replay}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-[11px] font-bold hover:bg-primary-100 border border-primary-100 transition-colors active:scale-[0.97]"
              >
                <RotateCcw className="w-3 h-3" />
                Putar Lagi
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PhaseTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex items-center gap-2 mb-3 px-1"
    >
      <span className="text-primary-600">{icon}</span>
      <p className="text-xs font-bold text-navy-700">{title}</p>
    </motion.div>
  );
}
