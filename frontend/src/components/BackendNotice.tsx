import { motion, AnimatePresence } from "framer-motion";
import { ServerCrash, RefreshCw, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { BackendState } from "@/hooks/useBackendStatus";

interface BackendNoticeProps {
  state: BackendState;
  retry: () => void;
}

export default function BackendNotice({ state, retry }: BackendNoticeProps) {
  return (
    <AnimatePresence>
      {state === "offline" && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 mb-6"
        >
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 rounded-xl p-2.5 flex-shrink-0">
              <ServerCrash className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-800">
                Server analisis belum merespons
              </p>
              <p className="text-sm text-amber-700 mt-1 leading-relaxed">
                Model AI berjalan di server terpisah, bukan di peramban. Pemeriksaan
                otomatis sudah dilakukan selama sekitar dua menit dan server tetap
                tidak menjawab, jadi penyebabnya kemungkinan bukan sekadar cold start.
              </p>
              <p className="text-sm text-amber-700 mt-2 leading-relaxed">
                Sementara itu,{" "}
                <Link
                  to="/demo"
                  className="font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                >
                  halaman demo
                </Link>{" "}
                menampilkan alur lengkap hasil skrining tanpa memerlukan server.
              </p>
              <button
                onClick={retry}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-white border border-amber-300 rounded-lg px-3 py-1.5 hover:bg-amber-100 transition-base"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Coba lagi
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {state === "checking" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-primary-50/70 border border-primary-100 rounded-2xl p-4 mb-6 flex items-center gap-3"
        >
          <Loader2 className="w-4 h-4 text-primary-600 animate-spin flex-shrink-0" />
          <p className="text-sm text-primary-800">
            Menghubungi server analisis untuk pertama kali bisa memakan waktu
            satu menit, karena model dimuat saat permintaan pertama masuk.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
