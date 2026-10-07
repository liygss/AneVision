import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  ArrowRight,
  Upload,
  Eye,
  Activity,
  BarChart3,
  Smartphone,
  ScanSearch,
  Shield,
  Zap,
  Brain,
  FlaskConical,
  Hand,
  Globe,
  Lock,
} from "lucide-react";
import HeroPhotoGrid from "@/components/HeroPhotoGrid";
import EyeArt from "@/components/EyeArt";
import NailArt from "@/components/NailArt";
import HbGauge from "@/components/HbGauge";
import ConfidenceChart from "@/components/ConfidenceChart";
import AnimatedCounter from "@/components/AnimatedCounter";
import SectionHeader from "@/components/SectionHeader";
import { buttonStyles } from "@/lib/utils";

const steps = [
  {
    icon: <Upload className="w-5 h-5" />,
    title: "Unggah Gambar Mata",
    desc: "Unggah gambar yang jelas dari area mata / konjungtiva.",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Unggah Gambar Kuku",
    desc: "Unggah gambar yang jelas dari area tempat kuku.",
  },
  {
    icon: <ScanSearch className="w-5 h-5" />,
    title: "Analisis AI",
    desc: "Anevision memproses kedua gambar menggunakan model AI yang telah dilatih.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Lihat Hasil Skrining",
    desc: "Sistem menampilkan nilai hemoglobin estimasi AI dan informasi skrining.",
  },
];

const smallFeatures = [
  {
    icon: <Activity className="w-5 h-5" />,
    title: "Estimasi Hemoglobin",
    desc: "Perkiraan kadar hemoglobin dalam satuan g/dL.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: "Tingkat Keyakinan AI",
    desc: "Menunjukkan keyakinan model saat tersedia.",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Skrining Cepat via Web",
    desc: "Proses cepat, cukup lewat browser.",
  },
  {
    icon: <Smartphone className="w-5 h-5" />,
    title: "Ramah Seluler",
    desc: "Unggah lewat kamera atau galeri ponsel.",
  },
];

const calibratedStats = [
  { value: 2, suffix: "", label: "Jenis Citra", desc: "Mata & kuku dianalisis" },
  { value: 2, suffix: "", label: "Model AI", desc: "Mata + kuku digabung" },
  { value: 100, suffix: "%", label: "Berbasis Web", desc: "Tanpa instalasi" },
];

const trustBadges = [
  { icon: <Shield className="w-3.5 h-3.5" />, text: "Non-Invasif" },
  { icon: <Zap className="w-3.5 h-3.5" />, text: "Hasil dalam Detik" },
  { icon: <Globe className="w-3.5 h-3.5" />, text: "100% Berbasis Browser" },
];

const headlineWords = [
  { text: "Deteksi", accent: false },
  { text: "Dini", accent: false },
  { text: "Risiko", accent: false },
  { text: "Anemia", accent: true },
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function Home() {
  const reduceMotion = useReducedMotion();
  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: stepsProgress } = useScroll({
    target: stepsRef,
    offset: ["start 0.85", "end 0.45"],
  });
  const connectorScale = useSpring(stepsProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.4,
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50/50 via-white to-white">
        <div className="absolute inset-0 grid-fade pointer-events-none" />
        <div
          className="absolute top-0 left-1/2 w-[900px] h-[640px] -translate-x-1/2 -translate-y-1/3 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(8,145,178,0.10) 0%, rgba(8,145,178,0.04) 38%, transparent 68%)",
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-12 items-center">
            {/* Left: text */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="text-center lg:text-left"
            >
              <motion.div
                variants={fadeUp}
                className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-primary-700 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border border-primary-100 shadow-sm shadow-primary-900/5 mb-7"
              >
                <Activity className="w-4 h-4" />
                Skrining Non-Invasif Berbasis AI
              </motion.div>

              <h1 className="text-[2.5rem] sm:text-6xl lg:text-[3.75rem] font-extrabold text-navy-900 tracking-[-0.03em] leading-[1.02] text-balance mb-7">
                <span className="block">
                  {headlineWords.map((word, i) => (
                    <span key={word.text}>
                      <span className="inline-block overflow-hidden pb-1 align-bottom">
                        <motion.span
                          className={word.accent ? "inline-block text-gradient" : "inline-block"}
                          initial={reduceMotion ? false : { y: "110%" }}
                          animate={{ y: 0 }}
                          transition={{
                            duration: 0.7,
                            delay: 0.1 + i * 0.055,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          {word.text}
                        </motion.span>
                      </span>
                      {i < headlineWords.length - 1 && " "}
                    </span>
                  ))}
                </span>
                <span className="block overflow-hidden pb-1">
                  <motion.span
                    className="inline-block"
                    initial={reduceMotion ? false : { y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.7, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
                  >
                    dari Mata &amp; Kuku
                  </motion.span>
                </span>
              </h1>

              <motion.p
                variants={fadeUp}
                className="text-base md:text-xl text-navy-600 mb-4 font-medium text-balance"
              >
                Ane<span className="text-primary-600">vision</span> adalah skrining awal anemia
                melalui analisis citra mata dan kuku
              </motion.p>

              <motion.p
                variants={fadeUp}
                className="text-sm md:text-base text-navy-600 mb-9 max-w-lg mx-auto lg:mx-0 leading-relaxed"
              >
                Unggah gambar mata dan kuku Anda untuk mendapatkan estimasi kadar hemoglobin
                berbasis AI dan hasil skrining risiko anemia. Cepat, non-invasif, dan sepenuhnya
                melalui browser.
              </motion.p>

              <motion.div
                variants={fadeUp}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 mb-6"
              >
                <Link to="/screening" className={buttonStyles("primary")}>
                  Mulai Skrining
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#cara-kerja" className={buttonStyles("secondary")}>
                  Cara Kerja
                </a>
              </motion.div>

              <motion.div variants={fadeUp} className="mb-8">
                <Link
                  to="/demo"
                  className="text-sm font-semibold text-primary-700 hover:text-primary-800 inline-flex items-center gap-1.5 group"
                >
                  <span className="link-underline">Lihat demo interaktif</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div
                variants={fadeUp}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-2"
              >
                {trustBadges.map((b) => (
                  <span
                    key={b.text}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-navy-600 bg-white/70 border border-navy-100/80 rounded-full px-3 py-1.5"
                  >
                    <span className="text-primary-600">{b.icon}</span>
                    {b.text}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Right: photo collage */}
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              <HeroPhotoGrid />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ STATS STRIP ============ */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 divide-navy-100/70">
            {calibratedStats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="relative text-center sm:text-left py-6 sm:py-2 sm:px-8 sm:py-8 first:sm:pl-0 last:sm:pr-0"
              >
                {i > 0 && (
                  <span className="hidden sm:block absolute left-0 top-1/2 -translate-y-1/2 h-14 w-px bg-gradient-to-b from-transparent via-navy-200/70 to-transparent" />
                )}
                <div className="inline-flex items-center gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-navy-600">
                    {s.label}
                  </span>
                </div>
                <AnimatedCounter
                  value={s.value}
                  decimals={0}
                  suffix={s.suffix}
                  className="block text-4xl md:text-5xl font-extrabold text-navy-900 tracking-[-0.03em] mt-2.5 tabular-nums"
                />
                <p className="text-sm text-navy-600 mt-1.5">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="hairline" />
      </div>

      {/* ============ PRATINJAU HASIL ============ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Lihat Sebelum Mencoba"
            title="Seperti Apa Hasilnya?"
            lead="Setelah analisis selesai, Anda akan melihat estimasi hemoglobin, tingkat risiko, dan keyakinan model dalam satu tampilan yang jelas."
          />

          {/* App chrome wrapper */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="surface-card overflow-hidden"
          >
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-navy-100/70 bg-navy-50/40">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-white border border-navy-100/80 rounded-md px-3 py-1 text-[11px] font-medium text-navy-600">
                <ScanSearch className="w-3 h-3 text-primary-600" />
                anevision.app/screening
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div className="p-5 md:p-6 md:border-r border-navy-100/70">
                <HbGauge value={11.8} />
              </div>
              <div className="p-5 md:p-6">
                <ConfidenceChart
                  eyeConfidence={0.86}
                  nailConfidence={0.81}
                  combinedConfidence={0.84}
                />
              </div>
            </div>
          </motion.div>

          <p className="text-center text-xs text-navy-600 mt-5">
            * Contoh visualisasi hasil skrining. Nilai sebenarnya berasal dari model AI.
          </p>
        </div>
      </section>

      {/* ============ CARA KERJA ============ */}
      <section id="cara-kerja" className="scroll-mt-20 py-20 md:py-28 bg-gradient-to-b from-white to-navy-50/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Proses Sederhana"
            title="Cara Kerja"
            lead="Empat langkah sederhana untuk mendapatkan estimasi skrining anemia berbasis AI."
          />

          <div ref={stepsRef} className="relative">
            {/* Base connector */}
            <div className="hidden lg:block absolute top-[52px] left-0 right-0 h-0.5 bg-navy-100 z-0" />
            {/* Scroll-driven progress connector */}
            <motion.div
              className="hidden lg:block absolute top-[52px] left-0 right-0 h-0.5 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600 origin-left z-0"
              style={{ scaleX: connectorScale }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 relative z-10">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, delay: i * 0.1 }}
                  className="surface-card surface-card-bordered p-6 h-full relative"
                >
                  <span className="absolute -top-3 -right-1 text-[56px] font-extrabold text-navy-900/[0.05] select-none leading-none pointer-events-none">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="relative flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-700">
                      {step.icon}
                    </div>
                    <span className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-[10px] font-bold flex items-center justify-center shadow-sm shadow-primary-600/25">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="relative text-sm font-bold text-navy-900 mb-2">{step.title}</h3>
                  <p className="relative text-xs text-navy-600 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ FITUR BENTO ============ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Fitur Unggulan"
            title="Kenapa Anevision?"
            lead="Dibangun untuk skrining anemia yang modern, mudah diakses, dan berorientasi riset."
          />

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Eye + Nail analysis (large) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45 }}
              className="md:col-span-7 surface-card surface-card-bordered overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 h-full">
                <div className="p-7">
                  <FeatureIcon icon={<Eye className="w-4.5 h-4.5" />} />
                  <h3 className="text-base font-bold text-navy-900">Analisis Ganda</h3>
                  <p className="text-sm text-navy-600 leading-relaxed mt-2.5">
                    Menganalisis citra mata (konjungtiva) dan kuku secara bersamaan untuk skrining
                    yang lebih komprehensif dan hasil yang lebih tepercaya.
                  </p>
                </div>
                <div className="p-7 bg-gradient-to-br from-primary-50/60 to-transparent flex items-center justify-center border-l border-navy-100/50">
                  <div className="w-28 h-28">
                    <EyeArt className="w-full h-full" animate={false} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* XAI (large) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="md:col-span-5 surface-card surface-card-bordered overflow-hidden flex flex-col"
            >
              <div className="p-7 flex-1">
                <FeatureIcon icon={<FlaskConical className="w-4.5 h-4.5" />} />
                <h3 className="text-base font-bold text-navy-900">Peta Perhatian (XAI)</h3>
                <p className="text-sm text-navy-600 leading-relaxed mt-2.5">
                  Hasil skrining dilengkapi peta perhatian konjungtiva dan kotak deteksi kuku, agar
                  dasar estimasi AI lebih transparan.
                </p>
              </div>
              <div className="px-7 pb-7 bg-gradient-to-t from-primary-50/50 to-transparent pt-2">
                <div className="flex items-center justify-center">
                  <div className="w-24 h-24">
                    <NailArt className="w-full h-full" animate={false} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Privacy (medium) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.04 }}
              className="md:col-span-5 surface-card surface-card-bordered p-7"
            >
              <FeatureIcon icon={<Lock className="w-4.5 h-4.5" />} />
              <h3 className="text-base font-bold text-navy-900">Privasi Terjaga</h3>
              <p className="text-sm text-navy-600 leading-relaxed mt-2.5">
                Foto diproses langsung di memori server dan tidak disimpan ke penyimpanan mana pun.
                Tidak ada akun, tidak ada riwayat yang tertinggal di perangkat.
              </p>
            </motion.div>

            {/* 4 small cards */}
            {smallFeatures.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: 0.08 + i * 0.06 }}
                className="md:col-span-3 surface-card surface-card-bordered p-6"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-700 mb-4">
                  {f.icon}
                </div>
                <h3 className="text-sm font-bold text-navy-900 mb-2">{f.title}</h3>
                <p className="text-xs text-navy-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BAGAIMANA AI BEKERJA ============ */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Cara Kerja Model"
            title="Bagaimana AI Bekerja"
            lead="Dua model berjalan terpisah: analisis citra mata dan segmentasi kuku, lalu digabungkan dengan pembobotan berdasarkan akurasi masing-masing."
          />

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-900 to-navy-800 noise-bg"
          >
            <div className="absolute -top-24 -right-16 w-72 h-72 bg-primary-500/15 rounded-full blur-3xl" />
            <div className="absolute -bottom-28 -left-20 w-72 h-72 bg-primary-400/10 rounded-full blur-3xl" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" />

            <div className="relative z-10 p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary-300" />
                </div>
                <h3 className="text-lg font-bold text-white">Pipeline Analisis Anevision</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Eye className="w-5 h-5" />,
                    title: "Analisis Mata",
                    desc: "Ensemble Ridge Regression + MobileNetV2 CNN pada citra konjungtiva.",
                    metric: "MAE ±1.3 g/dL",
                  },
                  {
                    icon: <Hand className="w-5 h-5" />,
                    title: "Analisis Kuku",
                    desc: "Deteksi & segmentasi kuku (YOLO26-seg), lalu estimasi Hb dengan CNN ResNet18.",
                    metric: "MAE ±1.4 g/dL",
                  },
                  {
                    icon: <ScanSearch className="w-5 h-5" />,
                    title: "Fusi & Klasifikasi",
                    desc: "Hasil kedua model digabung berdasar MAE, diklasifikasi sesuai threshold WHO.",
                    metric: "Keluaran 4–18 g/dL",
                  },
                ].map((s, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 p-4 rounded-xl bg-white/[0.06] border border-white/10 transition-smooth hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-primary-300">{s.icon}</span>
                      <p className="text-sm font-bold text-white">{s.title}</p>
                    </div>
                    <p className="text-xs text-navy-300 leading-relaxed">{s.desc}</p>
                    <span className="mt-auto inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-500/15 border border-primary-500/25 text-[11px] font-bold text-primary-200">
                      {s.metric}
                    </span>
                  </div>
                ))}
              </div>

              <div className="hairline my-7" />

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-navy-300">
                <span>
                  Threshold WHO:{" "}
                  <strong className="text-white">wanita &lt; 12.0</strong> ·{" "}
                  <strong className="text-white">pria &lt; 13.0 g/dL</strong>
                </span>
                <span>
                  Hasil akhir menghadap <strong className="text-white">rentang 4–18 g/dL</strong>{" "}
                  dan hanya untuk skrining awal.
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-20 md:py-24 bg-gradient-to-b from-white to-navy-50/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-700 to-navy-800 p-10 md:p-16 text-center noise-bg"
          >
            <div className="absolute -top-16 -left-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />
            <div className="absolute -bottom-20 -right-10 w-64 h-64 bg-primary-400/20 rounded-full blur-2xl" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

            <div className="absolute top-6 right-8 w-16 h-16 opacity-15 -rotate-12 hidden md:block">
              <EyeArt className="w-full h-full" animate={false} />
            </div>
            <div className="absolute bottom-4 left-8 w-16 h-16 opacity-15 rotate-12 hidden md:block">
              <NailArt className="w-full h-full" animate={false} />
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-[-0.025em] leading-[1.08] text-balance">
                Siap Mengenal Risiko Anemia Lebih Awal?
              </h2>
              <p className="text-primary-100/90 mb-9 max-w-md mx-auto text-sm md:text-base leading-relaxed">
                Unggah gambar mata dan kuku Anda untuk mendapatkan estimasi hemoglobin berbasis
                AI. Gratis dan tanpa instalasi.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/screening" className={buttonStyles("light")}>
                  Mulai Skrining Sekarang
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  to="/about"
                  className="text-sm font-semibold text-white/85 hover:text-white inline-flex items-center gap-1.5 group"
                >
                  <span className="link-underline">Pelajari metodologinya</span>
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function FeatureIcon({ icon }: { icon: ReactNode }) {
  return (
    <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-700 mb-3.5">
      {icon}
    </div>
  );
}
