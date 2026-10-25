import { motion } from "framer-motion";
import {
  Sun,
  Eye,
  Hand,
  Upload,
  Check,
  X,
  Camera,
  Lightbulb,
  ScanSearch,
} from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

const steps = [
  {
    icon: <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5" />,
    title: "Persiapkan Pencahayaan",
    desc: "Gunakan pencahayaan cukup (alami atau ruangan terang). Hindari backlight atau flash langsung yang bisa membuat bayangan.",
    number: "01",
  },
  {
    icon: <Eye className="w-4 h-4 sm:w-5 sm:h-5" />,
    title: "Ambil Foto Mata",
    desc: "Buka mata secara alami. Ambil foto area konjungtiva bagian dalam kelopak bawah dengan fokus jelas dan jarak yang pas.",
    number: "02",
  },
  {
    icon: <Hand className="w-4 h-4 sm:w-5 sm:h-5" />,
    title: "Ambil Foto Kuku",
    desc: "Letakkan tangan di permukaan datar. Ambil foto kuku jari dengan lensa bersih, tanpa filter, dan pastikan seluruh kuku terlihat dengan jelas.",
    number: "03",
  },
  {
    icon: <ScanSearch className="w-4 h-4 sm:w-5 sm:h-5" />,
    title: "Unggah & Analisis",
    desc: "Unggah kedua foto di halaman skrining. AI akan menganalisis secara bersamaan dan menampilkan hasil estimasi hemoglobin dalam ±10 detik.",
    number: "04",
  },
];

const tips = [
  "Fokus jelas, tidak buram",
  "Cukup cahaya (indoor/terang alami)",
  "Area yang dianalisis bersih",
  "Foto dari jarak sedang, tidak terlalu dekat/jauh",
];

const avoid = [
  "Menggunakan filter atau edit foto",
  "Kuku berwarna gelap, memakai aksesoris menutup",
  "Pencahayaan kuning redup atau backlight",
  "Flash langsung berlebihan",
  "Foto buram atau tidak fokus",
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function UsageGuide() {
  return (
    <section id="tata-cara" className="scroll-mt-20 py-16 sm:py-20 md:py-28 bg-gradient-to-b from-white to-navy-50/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Panduan Penggunaan"
          title="Tata Cara Pakai"
          lead="Ikuti langkah sederhana ini untuk mendapatkan hasil skrining yang lebih akurat dan konsisten."
        />

        {/* Steps */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8 sm:mb-12"
        >
          {steps.map((step, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className="premium-card premium-card-accent card-grid-texture p-5 sm:p-6 h-full relative overflow-hidden group hover:-translate-y-1 transition-smooth"
            >
              <div className="card-glow-corner" />
              <span className="absolute -top-2 sm:-top-3 -right-1 text-[44px] sm:text-[56px] font-extrabold text-navy-900/[0.04] select-none leading-none pointer-events-none z-0">
                {step.number}
              </span>
              <div className="relative flex items-center gap-2 sm:gap-2.5 mb-3 sm:mb-4">
                <div className="icon-chip w-9 h-9 sm:w-10 sm:h-10">
                  {step.icon}
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 text-white text-[9px] sm:text-[10px] font-bold flex items-center justify-center shadow-sm shadow-primary-600/25">
                  {i + 1}
                </div>
              </div>
              <h3 className="relative text-sm font-bold text-navy-900 mb-1.5 sm:mb-2">{step.title}</h3>
              <p className="relative text-xs text-navy-600 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Tips and Avoid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="premium-card premium-card-accent card-grid-texture p-5 sm:p-6 md:p-7 relative overflow-hidden"
          >
            <div className="card-glow-corner" />
            <div className="relative flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl icon-chip">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">Tips Foto yang Benar</h3>
                <p className="text-xs text-navy-600">Agar analisis lebih optimal</p>
              </div>
            </div>
            <ul className="relative space-y-2 sm:space-y-2.5">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2.5 sm:gap-3">
                  <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mt-0.5">
                    <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-600" />
                  </span>
                  <span className="text-sm text-navy-700 leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Avoid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="premium-card premium-card-accent card-grid-texture p-5 sm:p-6 md:p-7 relative overflow-hidden"
          >
            <div className="card-glow-corner" />
            <div className="relative flex items-center gap-2.5 sm:gap-3 mb-4 sm:mb-5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl icon-chip">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">Yang Perlu Dihindari</h3>
                <p className="text-xs text-navy-600">Hindari hal-hal berikut</p>
              </div>
            </div>
            <ul className="relative space-y-2 sm:space-y-2.5">
              {avoid.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 sm:gap-3">
                  <span className="flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mt-0.5">
                    <X className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-rose-600" />
                  </span>
                  <span className="text-sm text-navy-700 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* Mini info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="mt-6 sm:mt-8 text-center"
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-2 text-[11px] sm:text-xs text-navy-600 bg-white/70 backdrop-blur-sm border border-navy-100/80 rounded-full px-4 sm:px-6 py-2 sm:py-2.5">
            <span className="inline-flex items-center gap-1.5">
              <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-600" />
              Unggah 2 foto (mata & kuku)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ScanSearch className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-600" />
              Analisis bersamaan
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sun className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary-600" />
              Hasil dalam ±10 detik
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
