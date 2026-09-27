import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function Disclaimer() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl p-5 flex gap-4"
    >
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
      </div>
      <div>
        <h4 className="text-sm font-bold text-amber-900 mb-1">Penafian Medis</h4>
        <p className="text-sm text-amber-800 leading-relaxed">
          Anevision merupakan alat skrining awal berbasis AI dan <strong>bukan merupakan sistem diagnosis medis</strong>.
          Hasil harus dikonfirmasi melalui uji hemoglobin laboratorium dan evaluasi medis profesional.
        </p>
      </div>
    </motion.div>
  );
}
