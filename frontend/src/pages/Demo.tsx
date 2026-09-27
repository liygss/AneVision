import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Upload,
  Eye,
  ScanSearch,
  BarChart3,
  ChevronRight,
} from "lucide-react";
import ScreeningDemo from "@/components/ScreeningDemo";

const steps = [
  {
    icon: <Upload className="w-5 h-5" />,
    num: 1,
    title: "Unggah Gambar Mata",
    desc: "Pilih atau ambil foto area mata / konjungtiva Anda.",
  },
  {
    icon: <Eye className="w-5 h-5" />,
    num: 2,
    title: "Unggah Gambar Kuku",
    desc: "Pilih atau ambil foto area kuku / tempat kuku Anda.",
  },
  {
    icon: <ScanSearch className="w-5 h-5" />,
    num: 3,
    title: "Analisis AI",
    desc: "Model AI menganalisis kedua citra secara otomatis.",
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    num: 4,
    title: "Lihat Hasil Skrining",
    desc: "Dapatkan estimasi hemoglobin dan tingkat risiko anemia.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function Demo() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/15 via-white to-navy-50/30">
      {/* Subtle accent blob (static) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[560px] h-[560px] bg-primary-100/15 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Breadcrumb */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 text-xs text-navy-500 mb-8"
        >
          <Link
            to="/"
            className="hover:text-primary-600 transition-base font-medium"
          >
            Beranda
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-navy-600 font-semibold">Demo</span>
        </motion.nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <span className="inline-block text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">
            Demo Interaktif
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-navy-900 mb-4 tracking-tight">
            Simulasi Skrining{" "}
            <span className="text-gradient">Anevision</span>
          </h1>
          <p className="text-navy-500 max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Lihat bagaimana Anevision bekerja, dari unggah gambar hingga
            hasil estimasi hemoglobin berbasis AI.
          </p>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12 items-start">
          {/* Left: timeline steps */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="lg:col-span-2 space-y-0 order-2 lg:order-1"
          >
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="relative flex gap-4">
                {/* Vertical timeline line */}
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-primary-500/15 flex-shrink-0">
                    {step.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gradient-to-b from-primary-300 to-primary-100 my-1" />
                  )}
                </div>
                {/* Step content */}
                <div className="pb-8 pt-1">
                  <h3 className="text-sm font-bold text-navy-900 mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-navy-500 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* CTA */}
            <motion.div variants={fadeUp} className="pt-2 pl-14">
              <Link
                to="/screening"
                className="group w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold shadow-lg shadow-primary-600/20 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl transition-smooth text-sm hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Coba Sekarang
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </motion.div>

          {/* Right: demo panel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="lg:col-span-3 order-1 lg:order-2 lg:sticky lg:top-24"
          >
            <ScreeningDemo />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
