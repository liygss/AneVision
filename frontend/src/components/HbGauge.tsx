import { motion } from "framer-motion";
import AnimatedCounter from "./AnimatedCounter";

interface HbGaugeProps {
  value: number;
  min?: number;
  max?: number;
  threshold?: number;
}

export default function HbGauge({ value, min = 4, max = 18, threshold = 12.0 }: HbGaugeProps) {
  const range = max - min;
  const percentage = Math.max(0, Math.min(100, ((value - min) / range) * 100));

  const getRiskLabel = (v: number) => {
    if (v < 11) return { text: "Risiko Tinggi", color: "text-red-600", bg: "bg-red-50", border: "border-red-200" };
    if (v < threshold) return { text: "Risiko Sedang", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" };
    return { text: "Risiko Rendah", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" };
  };

  const risk = getRiskLabel(value);

  const radius = 80;
  const stroke = 12;
  const normalizedRadius = radius - stroke;
  const circumference = Math.PI * normalizedRadius;
  const filledLength = (percentage / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bg-white rounded-2xl border border-navy-100/80 shadow-sm p-6"
    >
      <h4 className="text-sm font-bold text-navy-800 mb-5">Tingkat Hemoglobin</h4>

      <div className="flex flex-col items-center">
        {/* Semicircle gauge */}
        <div className="relative w-48 h-28">
          <svg viewBox={`0 0 ${radius * 2} ${radius + 10}`} className="w-full h-full overflow-visible">
            {/* Background arc */}
            <path
              d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke} ${radius}`}
              fill="none"
              stroke="#e2e8f0"
              strokeWidth={stroke}
              strokeLinecap="round"
            />
            {/* Gradient fill arc */}
            <motion.path
              d={`M ${stroke} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - stroke} ${radius}`}
              fill="none"
              stroke="url(#gaugeGrad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference - filledLength }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
            {/* Tick marks */}
            {[0, 25, 50, 75, 100].map((pct, i) => {
              const angle = Math.PI * (1 - pct / 100);
              const x1 = radius + (normalizedRadius - 10) * Math.cos(angle);
              const y1 = radius + (normalizedRadius - 10) * Math.sin(angle);
              const x2 = radius + (normalizedRadius - 4) * Math.cos(angle);
              const y2 = radius + (normalizedRadius - 4) * Math.sin(angle);
              return (
                <line
                  key={i}
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#d9e2ec"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              );
            })}
            <defs>
              <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
          {/* Center value */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
            <AnimatedCounter
              value={value}
              decimals={1}
              className="text-4xl font-extrabold text-navy-900 tracking-tight"
            />
            <p className="text-sm text-navy-500 -mt-1">g/dL</p>
          </div>
        </div>

        {/* Risk badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${risk.bg} ${risk.border} mt-5`}>
          <span className={`text-sm font-bold ${risk.color}`}>{risk.text}</span>
        </div>

        {/* Scale bar */}
        <div className="w-full mt-5">
          <div
            className="h-2 rounded-full relative"
            style={{ backgroundImage: "linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #10b981 70%, #06b6d4 100%)" }}
          >
            <motion.div
              className="absolute -top-1 w-4 h-4 bg-white border-2 border-navy-800 rounded-full shadow-md"
              initial={{ left: "0%" }}
              animate={{ left: `${percentage}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ transform: "translateX(-50%)" }}
            />
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-navy-500 font-medium">
            <span>{min}</span>
            <span className="text-navy-600 font-bold">{value.toFixed(1)} g/dL</span>
            <span>{max}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
