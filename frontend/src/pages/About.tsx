import { motion } from "framer-motion";
import { Heart, Cpu, Globe, AlertTriangle, Eye, FlaskConical, Laptop2 } from "lucide-react";
import EyeArt from "@/components/EyeArt";
import NailArt from "@/components/NailArt";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function About() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-navy-50/30">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-12"
        >
          <span className="inline-block text-xs font-bold text-primary-600 uppercase tracking-widest mb-3">Tentang Proyek</span>
          <h1 className="text-3xl md:text-4xl font-extrabold text-navy-900 mb-4">Tentang Anevision</h1>
          <p className="text-navy-500 max-w-lg mx-auto">
            Memahami teknologi, tujuan, dan keterbatasan alat skrining anemia berbasis AI kami.
          </p>
        </motion.div>

        <div className="space-y-8">
          {/* The Problem */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-6 md:p-8 card-hover"
          >
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-red-500" />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-navy-900 mb-3">Masalah</h2>
                <p className="text-sm text-navy-600 leading-relaxed">
                  Anemia merupakan kondisi kesehatan yang meluas dan berdampak pada jutaan orang di seluruh dunia,
                  terutama di kawasan berkembang. Deteksi dini sangat krusial untuk pengelolaan dan penanganan yang efektif.
                  Uji hemoglobin tradisional memerlukan peralatan laboratorium dan tenaga terlatih yang mungkin tidak
                  terjangkau di semua wilayah. Anevision bertujuan menyediakan pendekatan skrining awal yang mudah diakses,
                  non-invasif, dan berbasis AI untuk melengkapi metode diagnostik yang ada.
                </p>
              </div>
            </div>
          </motion.section>

          {/* The Solution */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-6 md:p-8 card-hover"
          >
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                  <Eye className="w-7 h-7 text-primary-600" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-extrabold text-navy-900 mb-3">Solusi</h2>
                <p className="text-sm text-navy-600 leading-relaxed mb-5">
                  Anevision menggunakan computer vision dan deep learning untuk menganalisis gambar mata (konjungtiva)
                  dan tempat kuku, area yang dapat menunjukkan indikator fisik yang berkaitan dengan anemia.
                  Dengan memproses gambar-gambar ini melalui model AI yang telah dilatih, sistem memberikan
                  estimasi kadar hemoglobin dan klasifikasi risiko. Ini berfungsi sebagai alat skrining berbasis AI
                  untuk membantu mengidentifikasi individu yang mungkin mendapat manfaat dari evaluasi klinis lebih lanjut.
                </p>
                {/* Eye and Nail illustrations side by side */}
                <div className="flex items-center justify-center gap-6 mt-5">
                  <div className="w-24 h-24 md:w-28 md:h-28">
                    <EyeArt className="w-full h-full" animate={false} />
                  </div>
                  <div className="w-px h-14 bg-navy-200/60" />
                  <div className="w-24 h-24 md:w-28 md:h-28">
                    <NailArt className="w-full h-full" animate={false} />
                  </div>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Technology */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-6 md:p-8 card-hover"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                <Cpu className="w-7 h-7 text-primary-600" />
              </div>
              <h2 className="text-xl font-extrabold text-navy-900">Teknologi</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <FlaskConical className="w-5 h-5" />, title: "Computer Vision", desc: "Analisis citra dan ekstraksi fitur dari gambar konjungtiva dan tempat kuku." },
                { icon: <Cpu className="w-5 h-5" />, title: "Deep Learning", desc: "Model jaringan saraf tiruan yang dilatih untuk memperkirakan kadar hemoglobin dari fitur visual." },
                { icon: <Globe className="w-5 h-5" />, title: "React Frontend", desc: "Antarmuka web modern dan responsif yang dibangun dengan React, TypeScript, dan Tailwind CSS." },
                { icon: <Laptop2 className="w-5 h-5" />, title: "FastAPI Backend", desc: "API Python berperforma tinggi untuk pemrosesan citra dan inferensi model." },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="flex gap-3 p-4 rounded-xl bg-gradient-to-br from-navy-50/40 to-navy-50/20 border border-navy-100/40"
                >
                  <div className="text-primary-600 mt-0.5">{item.icon}</div>
                  <div>
                    <p className="text-sm font-bold text-navy-800">{item.title}</p>
                    <p className="text-xs text-navy-500 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Limitations */}
          <motion.section
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-extrabold text-navy-900">Keterbatasan</h2>
            </div>
            <p className="text-sm text-navy-600 leading-relaxed mb-4">
              Prediksi berbasis citra dapat dipengaruhi oleh beberapa faktor yang dapat memengaruhi akurasi:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {[
                "Kondisi pencahayaan",
                "Kualitas sensor kamera",
                "Ketajaman dan fokus gambar",
                "Pigmen kulit",
                "Sudut dan framing gambar",
                "Variasi biologis",
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2 text-sm text-amber-800 bg-amber-100/40 border border-amber-200/40 px-3 py-2 rounded-lg"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                  {item}
                </motion.div>
              ))}
            </div>
            <p className="text-sm text-navy-600 leading-relaxed">
              Anevision dirancang sebagai alat skrining dan <strong>tidak boleh digunakan sebagai pengganti diagnosis medis profesional</strong> atau uji hemoglobin laboratorium.
            </p>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
