import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  title: string;
  estimatedHb: number;
  confidence: number;
  icon: React.ReactNode;
  variant?: "default" | "highlighted";
  threshold?: number;
}

export default function ResultCard({
  title,
  estimatedHb,
  confidence,
  icon,
  variant = "default",
  threshold = 12.0,
}: ResultCardProps) {
  const getRiskColor = (hb: number) => {
    if (hb < 11) return "text-red-600 bg-red-50 border-red-200";
    if (hb < threshold) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-emerald-600 bg-emerald-50 border-emerald-200";
  };

  const getRiskLabel = (hb: number) => {
    if (hb < 11) return "Risiko Tinggi";
    if (hb < threshold) return "Risiko Sedang";
    return "Risiko Rendah";
  };

  const getConfidenceColor = (c: number) => {
    if (c >= 0.8) return "text-emerald-600";
    if (c >= 0.6) return "text-amber-600";
    return "text-red-600";
  };

  const getConfidenceLabel = (c: number) => {
    if (c >= 0.8) return "Tinggi";
    if (c >= 0.6) return "Sedang";
    return "Rendah";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "rounded-2xl border p-5 transition-smooth card-hover",
        variant === "highlighted"
          ? "bg-gradient-to-br from-white to-primary-50/30 border-primary-200 shadow-lg shadow-primary-500/8"
          : "bg-white border-navy-100/80 shadow-sm hover:shadow-md"
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xl">{icon}</span>
        <h4 className="text-sm font-bold text-navy-800">{title}</h4>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-navy-500 mb-1.5">Estimasi Hb</p>
          <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-bold", getRiskColor(estimatedHb))}>
            {estimatedHb.toFixed(1)} g/dL
            <span className="text-[10px] font-medium opacity-70 ml-1">
              ({getRiskLabel(estimatedHb)})
            </span>
          </div>
        </div>

        <div>
          <p className="text-xs text-navy-500 mb-1.5">Keyakinan Model</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-navy-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${confidence * 100}%` }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <span className={cn("text-sm font-bold", getConfidenceColor(confidence))}>
              {(confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className={cn("text-[10px] font-medium mt-1", getConfidenceColor(confidence))}>
            {getConfidenceLabel(confidence)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
