import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Hand, Brain, Focus, Layers, ScanSearch } from "lucide-react";
import SectionHeader from "@/components/SectionHeader";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "mata", label: "Mata", icon: <Eye className="w-4 h-4" /> },
  { id: "kuku", label: "Kuku", icon: <Hand className="w-4 h-4" /> },
];

export default function AttentionShowcase() {
  const [activeTab, setActiveTab] = useState<"mata" | "kuku">("mata");

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Transparan & Terjelaskan"
          title="Peta Perhatian & Deteksi YOLO"
          lead="Lihat bagaimana AI menilai area mana yang paling berpengaruh, lengkap dengan deteksi & segmentasi kuku berbasis YOLO26-seg."
        />

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center mb-10"
        >
          <div className="inline-flex items-center gap-1 bg-navy-50/60 backdrop-blur-sm border border-navy-100/80 rounded-full p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as "mata" | "kuku")}
                className={cn(
                  "relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-smooth",
                  activeTab === tab.id
                    ? "text-white"
                    : "text-navy-600 hover:text-navy-900"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-600/25"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Showcase Content */}
        <AnimatePresence mode="wait">
          {activeTab === "mata" && (
            <motion.div
              key="mata"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
            >
              {/* Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="surface-card overflow-hidden premium-card-accent relative">
                  <div className="card-glow-corner" />
                  {/* App chrome */}
                  <div className="relative flex items-center gap-3 px-5 py-3 border-b border-navy-100/70 bg-navy-50/40">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                      <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                      <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white border border-navy-100/80 rounded-md px-3 py-1 text-[11px] font-medium text-navy-600">
                      <Eye className="w-3 h-3 text-primary-600" />
                      Peta Perhatian - Mata (Konjungtiva)
                    </div>
                    <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-400/70 to-transparent animate-scan-line" />
                    </div>
                  </div>

                  {/* Image with heatmap overlay */}
                  <div className="relative p-5 md:p-7 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
                    <div className="relative max-w-[320px] mx-auto">
                      <div className="absolute -inset-4 rounded-[1.9rem] bg-gradient-to-tr from-primary-400/12 via-cyan-300/12 to-transparent blur-2xl" />
                      <div className="relative rounded-[1.6rem] bg-white/90 border border-white shadow-[0_50px_90px_-60px_rgba(8,145,178,0.95)] overflow-hidden ring-1 ring-primary-100/70">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-300/70 to-transparent" />
                        <div className="aspect-[4/5] relative">
                          <img
                            src="/image/mata_landing.jpeg"
                            alt="Peta Perhatian Mata - Konjungtiva"
                            className="w-full h-full object-cover object-center scale-[1.02]"
                          />
                          {/* Subtle heatmap overlay effect */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                "radial-gradient(circle at 46% 48%, rgba(239,68,68,0.2) 0%, rgba(251,191,36,0.14) 30%, rgba(59,130,246,0.08) 50%, transparent 74%)",
                              mixBlendMode: "multiply",
                            }}
                          />
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                "linear-gradient(180deg, transparent 64%, rgba(15,23,42,0.035) 100%)",
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[11px] text-navy-500 mt-3">
                  *Ilustrasi hasil peta perhatian untuk tujuan demonstrasi.
                </p>
              </motion.div>

              {/* Explanation */}
              <motion.div
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-primary-200 mb-4">
                    <Brain className="w-4 h-4" />
                    Explainable AI (XAI)
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-navy-900 mb-3 tracking-[-0.02em]">
                    Peta Perhatian Mata
                  </h3>
                  <p className="text-sm md:text-base text-navy-600 leading-relaxed">
                    Model menghasilkan peta perhatian berbasis GradCAM-style yang menunjukkan area konjungtiva mana yang paling berpengaruh terhadap estimasi kadar hemoglobin. Area berwarna hangat menandakan kontribusi yang lebih tinggi.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: <Focus className="w-4 h-4" />,
                      title: "Fokus pada Konjungtiva",
                      desc: "Perhitungan perhatian difokuskan pada area jaringan konjungtiva yang relevan, bukan seluruh mata.",
                    },
                    {
                      icon: <Brain className="w-4 h-4" />,
                      title: "Transparan",
                      desc: "Memungkinkan pemahaman mengapa model memberikan estimasi tertentu, bukan hanya hasil akhir.",
                    },
                    {
                      icon: <ScanSearch className="w-4 h-4" />,
                      title: "Konsisten dengan Klinis",
                      desc: "Area yang diperhatikan umumnya berkorelasi dengan area pemeriksaan konjungtiva secara konvensional.",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-navy-50/40 border border-navy-100/60"
                    >
                      <div className="w-9 h-9 rounded-lg icon-chip flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-navy-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-navy-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "kuku" && (
            <motion.div
              key="kuku"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
            >
              {/* Preview */}
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="surface-card overflow-hidden premium-card-accent relative">
                  <div className="card-glow-corner" />
                  {/* App chrome */}
                  <div className="relative flex items-center gap-3 px-5 py-3 border-b border-navy-100/70 bg-navy-50/40">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                      <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                      <span className="w-2.5 h-2.5 rounded-full bg-navy-200" />
                    </div>
                    <div className="hidden sm:flex items-center gap-2 bg-white border border-navy-100/80 rounded-md px-3 py-1 text-[11px] font-medium text-navy-600">
                      <Hand className="w-3 h-3 text-primary-600" />
                      Deteksi, Segmentasi & Peta Perhatian - Kuku
                    </div>
                    <div className="absolute inset-x-0 top-0 h-px overflow-hidden">
                      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary-400/70 to-transparent animate-scan-line" />
                    </div>
                  </div>

                  {/* Image with YOLO + heatmap overlay */}
                  <div className="relative p-5 md:p-7 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
                    <div className="relative max-w-[320px] mx-auto">
                      <div className="absolute -inset-4 rounded-[1.9rem] bg-gradient-to-tr from-primary-400/12 via-cyan-300/12 to-transparent blur-2xl" />
                      <div className="relative rounded-[1.6rem] bg-white/90 border border-white shadow-[0_50px_90px_-60px_rgba(8,145,178,0.95)] overflow-hidden ring-1 ring-primary-100/70">
                        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-300/70 to-transparent" />
                        <div className="aspect-[4/5] relative">
                          <img
                            src="/image/kuku_landing.jpeg"
                            alt="Deteksi, Segmentasi & Peta Perhatian Kuku - YOLO26-seg"
                            className="w-full h-full object-cover object-center scale-[1.01]"
                          />
                          {/* Heatmap overlay effect */}
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                "radial-gradient(ellipse at 50% 42%, rgba(249,115,22,0.18) 0%, rgba(239,68,68,0.14) 35%, transparent 70%)",
                              mixBlendMode: "multiply",
                            }}
                          />
                          <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                              background:
                                "linear-gradient(180deg, transparent 66%, rgba(15,23,42,0.035) 100%)",
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-center text-[11px] text-navy-500 mt-3">
                  *Ilustrasi hasil deteksi & peta perhatian untuk tujuan demonstrasi.
                </p>
              </motion.div>

              {/* Explanation */}
              <motion.div
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="space-y-6"
              >
                <div>
                  <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-primary-200 mb-4">
                    <Layers className="w-4 h-4" />
                    YOLO26-seg + XAI
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-navy-900 mb-3 tracking-[-0.02em]">
                    Deteksi, Segmentasi & Peta Perhatian Kuku
                  </h3>
                  <p className="text-sm md:text-base text-navy-600 leading-relaxed">
                    Model YOLO26-seg mendeteksi dan mensegmentasi area kuku secara otomatis. Hanya area kuku tersegmentasi yang digunakan untuk estimasi hemoglobin, dilengkapi peta perhatian untuk transparansi hasil AI.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: <ScanSearch className="w-4 h-4" />,
                      title: "Deteksi Otomatis (YOLO26-seg)",
                      desc: "Mendeteksi posisi kuku secara otomatis untuk memastikan analisis berfokus pada area yang tepat dan konsisten.",
                    },
                    {
                      icon: <Layers className="w-4 h-4" />,
                      title: "Segmentasi Tepat",
                      desc: "Hanya nail plate tersegmentasi yang diekstraksi, menghindari area kulit di sekitar yang bisa menambah noise pada prediksi.",
                    },
                    {
                      icon: <Brain className="w-4 h-4" />,
                      title: "Peta Perhatian Kuku",
                      desc: "Menunjukkan wilayah pada kuku tersegmentasi yang berkontribusi terhadap prediksi estimasi hemoglobin berbasis AI.",
                    },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.15 + i * 0.08 }}
                      className="flex items-start gap-3 p-4 rounded-xl bg-navy-50/40 border border-navy-100/60"
                    >
                      <div className="w-9 h-9 rounded-lg icon-chip flex-shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-navy-900 mb-1">{item.title}</h4>
                        <p className="text-xs text-navy-600 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Legend */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-navy-600"
        >
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-0.5 rounded-full bg-red-400" />
            Warna hangat = area berpengaruh tinggi
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-0.5 rounded-full bg-primary-500" />
            Deteksi & segmentasi berbasis YOLO26-seg
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="w-3 h-0.5 rounded-full bg-amber-400" />
            Fokus pada area kuku tersegmentasi
          </span>
        </motion.div>
      </div>
    </section>
  );
}
