import { motion } from "framer-motion";
import { Eye, Hand, GitMerge, Activity, BarChart3, ShieldAlert } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";

const metrics = [
  {
    icon: <Eye className="w-5 h-5" />,
    title: "Analisis Mata - Ensemble",
    subtitle: "Utama (Penentu Hasil)",
    items: [
      { label: "Model", value: "Ridge Regression + MobileNetV2" },
      { label: "MAE", value: "±1.3 g/dL" },
      { label: "Area Fokus", value: "Konjungtiva" },
      { label: "Threshold", value: "WHO Gender-Based" },
    ],
    highlight: true,
  },
  {
    icon: <Hand className="w-5 h-5" />,
    title: "Analisis Kuku",
    subtitle: "Referensi Tambahan",
    items: [
      { label: "Model", value: "YOLO26-seg + ResNet18" },
      { label: "MAE", value: "±1.4 g/dL" },
      { label: "Deteksi", value: "Otomatis & Tersegmentasi" },
      { label: "Validasi", value: "Guard / Plausibility Check" },
    ],
    highlight: false,
  },
  {
    icon: <GitMerge className="w-5 h-5" />,
    title: "Fusi Terbobot (MAE-weighted)",
    subtitle: "Kombinasi Kedua Model",
    items: [
      { label: "Metode", value: "Pembobotan invers MAE" },
      { label: "Dominan", value: "Mata (lebih berat)" },
      { label: "Rentang", value: "4 – 18 g/dL" },
      { label: "Penggunaan", value: "Referensi (mata tetap penentu)" },
    ],
    highlight: false,
  },
];

const classificationMetrics = [
  { label: "MAE Mata (Ensemble)", value: "±1.3 g/dL" },
  { label: "MAE Kuku", value: "±1.4 g/dL" },
  { label: "Precision (Klasifikasi Anemia)", value: "~65.6%" },
  { label: "Recall (Klasifikasi Anemia)", value: "~80.0%" },
];

const thresholds = [
  { gender: "Pria", value: "< 13.0 g/dL" },
  { gender: "Wanita", value: "< 12.0 g/dL" },
  { gender: "Ibu Hamil", value: "≥ 11.0 g/dL (referensi)" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function ModelMetrics() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white to-navy-50/40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Validasi & Kredibilitas"
          title="Matriks Performa Model"
          lead="Ringkasan performa model berdasarkan evaluasi internal untuk skrining awal anemia berbasis citra."
        />

        {/* Main metrics cards */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={stagger}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10"
        >
          {metrics.map((metric, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              className={`premium-card premium-card-accent card-grid-texture p-6 relative overflow-hidden h-full ${
                metric.highlight ? "ring-1 ring-primary-200/60" : ""
              }`}
            >
              <div className="card-glow-corner" />
              <div className="relative flex items-start justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="icon-chip w-10 h-10">
                    {metric.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-navy-900">{metric.title}</h3>
                    <p className="text-[11px] text-navy-500">{metric.subtitle}</p>
                  </div>
                </div>
                {metric.highlight && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-200">
                    UTAMA
                  </span>
                )}
              </div>
              <ul className="relative space-y-2.5">
                {metric.items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-navy-600">{item.label}</span>
                    <span className="font-semibold text-navy-900 text-right">{item.value}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Detailed metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Classification metrics */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="premium-card premium-card-accent card-grid-texture p-6 md:p-7 relative overflow-hidden"
          >
            <div className="card-glow-corner" />
            <div className="relative flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl icon-chip">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">Metrik Evaluasi</h3>
                <p className="text-xs text-navy-600">Mean Absolute Error & Klasifikasi</p>
              </div>
            </div>
            <div className="relative grid grid-cols-2 gap-4">
              {classificationMetrics.map((m, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/60 border border-navy-100/60">
                  <p className="text-[11px] text-navy-600 mb-1.5">{m.label}</p>
                  <p className="text-lg font-extrabold text-navy-900 tabular-nums">{m.value}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* WHO Thresholds */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="premium-card premium-card-accent card-grid-texture p-6 md:p-7 relative overflow-hidden"
          >
            <div className="card-glow-corner" />
            <div className="relative flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl icon-chip">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-navy-900">Threshold Anemia (WHO)</h3>
                <p className="text-xs text-navy-600">Batas klasifikasi yang digunakan</p>
              </div>
            </div>
            <div className="relative space-y-2.5">
              {thresholds.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/60 border border-navy-100/60">
                  <span className="text-sm text-navy-700">{t.gender}</span>
                  <span className="text-sm font-bold text-navy-900">{t.value}</span>
                </div>
              ))}
            </div>
            <p className="relative text-[11px] text-navy-500 mt-3">
              Model mata menggunakan threshold berbasis jenis kelamin sesuai WHO. Hasil akhir mengacu pada model mata sebagai penentu.
            </p>
          </motion.div>
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl bg-amber-50/60 border border-amber-200/60"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-900 mb-0.5">Penting</p>
            <p className="text-xs text-amber-800 leading-relaxed">
              Anevision merupakan alat <strong>skrining awal</strong>, bukan alat diagnosis medis. Hasil estimasi berbasis AI harus dikonfirmasi menggunakan uji hemoglobin darah standar oleh tenaga kesehatan profesional.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
