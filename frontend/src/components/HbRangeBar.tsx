import { motion } from "framer-motion";

interface HbRangeBarProps {
  value: number;
  range?: { min: number; max: number } | null;
  min?: number;
  max?: number;
  threshold?: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HbRangeBar({
  value,
  range,
  min = 4,
  max = 18,
  threshold = 12,
}: HbRangeBarProps) {
  const span = max - min || 1;
  const toPct = (v: number) => Math.max(0, Math.min(100, ((v - min) / span) * 100));

  const normalMin = threshold;
  const normalMax = threshold < 12.5 ? 15.5 : 17.5;
  const hasRange = !!range && range.min != null && range.max != null;

  const bandLeft = hasRange ? toPct(range!.min) : toPct(value);
  const bandRight = hasRange ? toPct(range!.max) : toPct(value);
  const bandWidth = Math.max(2, bandRight - bandLeft);
  const valuePct = toPct(value);
  const thresholdPct = toPct(threshold);

  return (
    <div className="w-full">
      <div className="relative h-12">
        {/* Track, same colour scale as the Hb gauge */}
        <div
          className="absolute inset-x-0 top-5 h-2 rounded-full"
          style={{
            backgroundImage:
              "linear-gradient(90deg, #ef4444 0%, #f59e0b 40%, #10b981 70%, #06b6d4 100%)",
          }}
        />

        {/* Physiologically normal band, WHO */}
        <div
          className="absolute top-5 h-2 rounded-full border-x-2 border-white/80 bg-white/25"
          style={{
            left: `${toPct(normalMin)}%`,
            width: `${Math.max(2, toPct(normalMax) - toPct(normalMin))}%`,
          }}
        />

        {/* Model uncertainty band */}
        <motion.div
          className="absolute top-3.5 h-5 rounded-md border-2 border-navy-900/75 bg-white/90"
          initial={{ left: `${valuePct}%`, width: 0, opacity: 0 }}
          whileInView={{ left: `${bandLeft}%`, width: `${bandWidth}%`, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5, ease: EASE }}
        />

        {/* WHO threshold marker */}
        <div
          className="absolute top-1.5 bottom-1 w-px bg-navy-900/40"
          style={{ left: `${thresholdPct}%` }}
        />

        {/* Point estimate marker */}
        <motion.div
          className="absolute top-3.5 -ml-2 h-4 w-4 rounded-full bg-white border-[3px] border-navy-900 shadow-[0_2px_6px_rgba(16,42,67,0.28)]"
          style={{ left: `${valuePct}%` }}
          initial={{ opacity: 0, scale: 0.4 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.75, ease: EASE }}
        >
          <span className="absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-extrabold text-navy-900 tabular-nums">
            {value.toFixed(1)}
          </span>
        </motion.div>

        {/* WHO label, kept out of the way of the markers */}
        <div
          className="absolute -bottom-0.5 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider text-navy-700"
          style={{ left: `${thresholdPct}%` }}
        >
          ambang {threshold.toFixed(1)}
        </div>
      </div>

      <div className="mt-4 flex justify-between text-[10px] font-semibold text-navy-600 tabular-nums">
        <span>{min.toFixed(0)} g/dL</span>
        <span className="hidden sm:inline">
          {hasRange
            ? `rentang estimasi ${range!.min.toFixed(1)}–${range!.max.toFixed(1)} g/dL`
            : "rentang estimasi tidak tersedia"}
        </span>
        <span>{max.toFixed(0)} g/dL</span>
      </div>
    </div>
  );
}
