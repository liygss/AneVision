import { motion } from "framer-motion";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Siren,
  Pill,
  Apple,
  Stethoscope,
  Hospital,
  HeartPulse,
  Leaf,
  Droplets,
  Sun,
  Dumbbell,
} from "lucide-react";

interface AnemiaRecommendationProps {
  estimatedHb: number;
  confidence: number;
  estimatedRange?: { min: number; max: number };
}

interface AnemiaConfig {
  level: string;
  label: string;
  description: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  iconBg: string;
  icon: React.ReactNode;
  treatment: { icon: React.ReactNode; text: string }[];
  prevention: { icon: React.ReactNode; text: string }[];
}

function getConfig(hb: number): AnemiaConfig {
  if (hb >= 12.0) {
    return {
      level: "normal",
      label: "Tidak Anemia",
      description:
        "Estimasi kadar hemoglobin Anda berada dalam rentang normal. Pertahankan pola hidup sehat dan lakukan pemeriksaan berkala.",
      color: "text-emerald-700",
      bgGradient: "from-emerald-500 to-emerald-600",
      borderColor: "border-emerald-200",
      iconBg: "bg-emerald-100",
      icon: <ShieldCheck className="w-7 h-7 text-emerald-600" />,
      treatment: [
        { icon: <Apple className="w-4 h-4" />, text: "Pertahankan pola makan seimbang dengan asupan zat besi, vitamin B12, dan asam folat yang cukup." },
        { icon: <Dumbbell className="w-4 h-4" />, text: "Rutin berolahraga minimal 30 menit per hari untuk menjaga sirkulasi darah." },
        { icon: <Stethoscope className="w-4 h-4" />, text: "Lakukan pemeriksaan darah minimal satu tahun sekali sebagai pemantauan." },
      ],
      prevention: [
        { icon: <Leaf className="w-4 h-4" />, text: "Konsumsi sayuran hijau, kacang-kacangan, dan biji-bijian secara rutin." },
        { icon: <Sun className="w-4 h-4" />, text: "Peroleh paparan sinar matahari yang cukup untuk sintesis vitamin D." },
        { icon: <HeartPulse className="w-4 h-4" />, text: "Hindari kebiasaan minum teh atau kopi bersamaan dengan makanan tinggi zat besi." },
      ],
    };
  }

  if (hb >= 10.0) {
    return {
      level: "mild",
      label: "Anemia Ringan",
      description:
        "Estimasi kadar hemoglobin Anda sedikit di bawah normal. Kondisi ini umum dan dapat ditangani dengan perubahan pola makan serta suplemen jika diperlukan.",
      color: "text-amber-700",
      bgGradient: "from-amber-500 to-amber-600",
      borderColor: "border-amber-200",
      iconBg: "bg-amber-100",
      icon: <AlertTriangle className="w-7 h-7 text-amber-600" />,
      treatment: [
        { icon: <Pill className="w-4 h-4" />, text: "Konsumsi suplemen zat besi sesuai anjuran dokter untuk meningkatkan kadar hemoglobin." },
        { icon: <Apple className="w-4 h-4" />, text: "Perbanyak makanan kaya zat besi: daging merah, hati, bayam, kacang merah, dan tiram." },
        { icon: <Droplets className="w-4 h-4" />, text: "Kombinasikan makanan tinggi zat besi dengan vitamin C (jeruk, paprika, tomat) untuk penyerapan optimal." },
        { icon: <Stethoscope className="w-4 h-4" />, text: "Konsultasikan hasil skrining ini dengan dokter untuk evaluasi lebih lanjut." },
      ],
      prevention: [
        { icon: <Leaf className="w-4 h-4" />, text: "Hindari mengonsumsi teh, kopi, atau susu dalam waktu bersamaan dengan makanan kaya zat besi." },
        { icon: <Sun className="w-4 h-4" />, text: "Pastikan asupan vitamin B12 dan asam folat cukup dari telur, ikan, dan sereal." },
        { icon: <HeartPulse className="w-4 h-4" />, text: "Pantau kondisi kesehatan secara berkala dan ulangi skrining dalam 1-3 bulan." },
      ],
    };
  }

  if (hb >= 8.0) {
    return {
      level: "moderate",
      label: "Anemia Sedang",
      description:
        "Estimasi kadar hemoglobin Anda cukup rendah dan memerlukan perhatian medis. Segera konsultasikan dengan tenaga kesehatan untuk diagnosis dan penanganan yang tepat.",
      color: "text-orange-700",
      bgGradient: "from-orange-500 to-orange-600",
      borderColor: "border-orange-200",
      iconBg: "bg-orange-100",
      icon: <AlertCircle className="w-7 h-7 text-orange-600" />,
      treatment: [
        { icon: <Stethoscope className="w-4 h-4" />, text: "Segera konsultasi dengan dokter untuk pemeriksaan darah lengkap dan diagnosis pasti." },
        { icon: <Pill className="w-4 h-4" />, text: "Dokter mungkin akan meresepkan suplemen zat besi oral atau intravena sesuai kebutuhan." },
        { icon: <Hospital className="w-4 h-4" />, text: "Pertimbangkan pemeriksaan lanjutan untuk menentukan penyebab anemia (defisiensi zat besi, thalasemia, dll)." },
        { icon: <Apple className="w-4 h-4" />, text: "Tingkatkan asupan makanan bergizi tinggi zat besi, protein, vitamin B12, dan asam folat." },
      ],
      prevention: [
        { icon: <Leaf className="w-4 h-4" />, text: "Jaga pola makan teratur dengan porsi seimbang setiap hari." },
        { icon: <Droplets className="w-4 h-4" />, text: "Hindari konsumsi alkohol berlebihan yang dapat menghambat produksi sel darah merah." },
        { icon: <HeartPulse className="w-4 h-4" />, text: "Lakukan kontrol rutin ke dokter setiap 2-4 minggu hingga kadar hemoglobin membaik." },
      ],
    };
  }

  return {
    level: "severe",
    label: "Anemia Berat",
    description:
      "Estimasi kadar hemoglobin Anda sangat rendah dan berisiko tinggi. Ini adalah kondisi yang memerlukan penanganan medis segera.",
    color: "text-red-700",
    bgGradient: "from-red-500 to-red-600",
    borderColor: "border-red-200",
    iconBg: "bg-red-100",
    icon: <Siren className="w-7 h-7 text-red-600" />,
    treatment: [
      { icon: <Siren className="w-4 h-4" />, text: "Segera ke unit gawat darurat atau rumah sakit untuk penanganan medis segera." },
      { icon: <Hospital className="w-4 h-4" />, text: "Kemungkinan memerlukan transfusi darah untuk meningkatkan kadar hemoglobin dengan cepat." },
      { icon: <Stethoscope className="w-4 h-4" />, text: "Pemeriksaan darah lengkap, tes feritin, vitamin B12, asam folat, dan tes pendukung lainnya." },
      { icon: <Pill className="w-4 h-4" />, text: "Perawatan intensif dengan suplemen zat besi intravena dan monitoring ketat." },
    ],
    prevention: [
      { icon: <HeartPulse className="w-4 h-4" />, text: "Jangan menunda pencarian bantuan medis, anemia berat dapat mengancam jiwa." },
      { icon: <Leaf className="w-4 h-4" />, text: "Setelah stabil, patuhi rencana pengobatan dan kontrol rutin yang ditetapkan dokter." },
      { icon: <Sun className="w-4 h-4" />, text: "Identifikasi dan tangani penyebab dasar anemia (perdarahan, defisiensi, atau kondisi medis lain)." },
    ],
  };
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

export default function AnemiaRecommendation({
  estimatedHb,
  confidence,
  estimatedRange,
}: AnemiaRecommendationProps) {
  const config = getConfig(estimatedHb);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeUp}
      className="mb-8"
    >
      <div className={`bg-white rounded-2xl border ${config.borderColor} shadow-lg overflow-hidden`}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.bgGradient} px-6 py-4`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
              {config.icon}
            </div>
            <div>
              <p className="text-xs font-bold text-white/60 uppercase tracking-wider">Klasifikasi Anemia</p>
              <h3 className="text-xl font-extrabold text-white">{config.label}</h3>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Description */}
          <p className="text-sm text-navy-600 leading-relaxed mb-6">{config.description}</p>

          {/* Stats row */}
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="grid grid-cols-3 gap-3 mb-8">
            <motion.div variants={fadeUp} className="text-center p-3.5 rounded-xl bg-navy-50/50 border border-navy-100/40">
              <p className="text-xs text-navy-400 mb-1">Estimasi Hb</p>
              <p className="text-lg font-extrabold text-navy-900">{estimatedHb.toFixed(1)}</p>
              <p className="text-[10px] text-navy-400">g/dL</p>
            </motion.div>
            <motion.div variants={fadeUp} className="text-center p-3.5 rounded-xl bg-navy-50/50 border border-navy-100/40">
              <p className="text-xs text-navy-400 mb-1">Confidence</p>
              <p className={`text-lg font-extrabold ${config.color}`}>{(confidence * 100).toFixed(0)}%</p>
              <p className="text-[10px] text-navy-400">Keyakinan AI</p>
            </motion.div>
            <motion.div variants={fadeUp} className="text-center p-3.5 rounded-xl bg-navy-50/50 border border-navy-100/40">
              <p className="text-xs text-navy-400 mb-1">Rentang</p>
              <p className="text-lg font-extrabold text-navy-900">
                {estimatedRange ? `${estimatedRange.min.toFixed(1)}–${estimatedRange.max.toFixed(1)}` : "-"}
              </p>
              <p className="text-[10px] text-navy-400">g/dL</p>
            </motion.div>
          </motion.div>

          {/* Two columns: Treatment + Prevention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Treatment */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-lg ${config.iconBg} flex items-center justify-center`}>
                  <Pill className="w-4 h-4 text-navy-600" />
                </div>
                <h4 className="text-sm font-bold text-navy-800">Rekomendasi Penanganan</h4>
              </div>
              <div className="space-y-2.5">
                {config.treatment.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-navy-50/40 to-transparent border border-navy-100/30">
                    <span className="text-primary-600 mt-0.5 flex-shrink-0">{item.icon}</span>
                    <p className="text-xs text-navy-600 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Prevention */}
            <motion.div variants={fadeUp}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <Leaf className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-sm font-bold text-navy-800">Pencegahan & Pemeliharaan</h4>
              </div>
              <div className="space-y-2.5">
                {config.prevention.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50/30 to-transparent border border-emerald-100/30">
                    <span className="text-emerald-600 mt-0.5 flex-shrink-0">{item.icon}</span>
                    <p className="text-xs text-navy-600 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
