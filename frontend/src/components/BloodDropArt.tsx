import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

const DROP_PATH =
  "M100 18 C100 18, 54 90, 54 131 C54 167, 74 192, 100 192 C126 192, 146 167, 146 131 C146 90, 100 18, 100 18 Z";

type Band = "pale" | "mid" | "rich";

const BANDS: Record<Band, { a: string; b: string; c: string; ring: string; ink: string }> = {
  pale: { a: "#ffe4e6", b: "#fda4af", c: "#f87171", ring: "#f43f5e", ink: "#243b53" },
  mid: { a: "#fca5a5", b: "#ef4444", c: "#b91c1c", ring: "#dc2626", ink: "#ffffff" },
  rich: { a: "#f87171", b: "#dc2626", c: "#7f1d1d", ring: "#b91c1c", ink: "#ffffff" },
};

const MIN_Y = 186;
const MAX_Y = 64;

interface BloodDropArtProps {
  className?: string;
  animate?: boolean;
  value?: number;
  min?: number;
  max?: number;
  threshold?: number;
  showValue?: boolean;
  decimals?: number;
}

export default function BloodDropArt({
  className = "",
  animate = true,
  value,
  min = 4,
  max = 18,
  threshold = 12,
  showValue = false,
  decimals = 1,
}: BloodDropArtProps) {
  const uid = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();

  const hasValue = typeof value === "number" && Number.isFinite(value);
  const hb = hasValue ? (value as number) : threshold;

  const band: Band = hb < 11 ? "pale" : hb < threshold ? "mid" : "rich";
  const tone = BANDS[band];

  const ratio = Math.max(0, Math.min(1, (hb - min) / (max - min || 1)));
  const yTop = MIN_Y - ratio * (MIN_Y - MAX_Y);

  const shouldAnimate = animate && !reduceMotion;
  const liquidProps = shouldAnimate
    ? {
        initial: { opacity: 0, scale: 0.88 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
      }
    : { animate: { opacity: 1, scale: 1 } };

  return (
    <motion.div
      className={`relative ${className}`}
      {...liquidProps}
    >
      <svg
        viewBox="0 0 200 210"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full overflow-visible"
        role={showValue ? "img" : "presentation"}
        aria-label={
          showValue
            ? `Ilustrasi tetesan darah dengan estimasi hemoglobin ${hb.toFixed(decimals)} gram per desiliter`
            : undefined
        }
      >
        <defs>
          <linearGradient id={`blood-${uid}`} x1="18%" y1="8%" x2="82%" y2="95%">
            <stop offset="0%" stopColor={tone.a} />
            <stop offset="52%" stopColor={tone.b} />
            <stop offset="100%" stopColor={tone.c} />
          </linearGradient>

          <linearGradient id={`glass-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3" />
          </linearGradient>

          <linearGradient id={`air-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#f8fafc" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.42" />
          </linearGradient>

          <linearGradient id={`spec-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          <radialGradient id={`halo-${uid}`} cx="50%" cy="58%" r="50%">
            <stop offset="0%" stopColor={tone.ring} stopOpacity="0.3" />
            <stop offset="100%" stopColor={tone.ring} stopOpacity="0" />
          </radialGradient>

          <filter id={`soft-${uid}`} x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#7f1d1d" floodOpacity="0.22" />
          </filter>

          <clipPath id={`clip-${uid}`}>
            <path d={DROP_PATH} />
          </clipPath>
        </defs>

        {/* Ambient halo */}
        <ellipse cx="100" cy="128" rx="96" ry="96" fill={`url(#halo-${uid})`} />

        {/* Glass body behind the liquid */}
        <path
          d={DROP_PATH}
          fill={`url(#glass-${uid})`}
          stroke={tone.ring}
          strokeOpacity="0.28"
          strokeWidth="1.5"
        />

        {/* Liquid: a full-height blood column, with an animated glass cover
            revealing it from the bottom. Only `height` is animated so nothing
            collides with framer-motion's transform handling of `y`. */}
        <g clipPath={`url(#clip-${uid})`}>
          <rect x="34" y="0" width="132" height="210" fill={`url(#blood-${uid})`} />
          <motion.rect
            x="34"
            y="0"
            width="132"
            fill={`url(#air-${uid})`}
            initial={shouldAnimate ? { height: 200 } : false}
            animate={{ height: yTop }}
            transition={shouldAnimate ? { duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          />
          {/* Meniscus riding the liquid surface */}
          <motion.ellipse
            cx="100"
            rx="66"
            ry="4.5"
            fill="#ffffff"
            fillOpacity="0.28"
            initial={shouldAnimate ? { cy: 196 } : false}
            animate={{ cy: yTop }}
            transition={shouldAnimate ? { duration: 1.1, delay: 0.25, ease: [0.22, 1, 0.36, 1] } : { duration: 0 }}
          />
        </g>

        {/* Shadow just under the liquid line */}
        <motion.path
          d={`M54 ${yTop + 1} Q100 ${yTop + 9} 146 ${yTop + 1}`}
          stroke="#7f1d1d"
          strokeOpacity="0.18"
          strokeWidth="3"
          fill="none"
          initial={shouldAnimate ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={shouldAnimate ? { duration: 0.5, delay: 1.05 } : { duration: 0 }}
        />

        {/* Glass specular highlight */}
        <path
          d="M84 44 C70 62, 65 88, 68 112 C74 104, 82 96, 88 84 C92 74, 90 56, 84 44 Z"
          fill={`url(#spec-${uid})`}
          clipPath={`url(#clip-${uid})`}
          opacity="0.75"
        />

        {/* Rim light on the lower right */}
        <path
          d="M146 131 C146 167, 126 192, 100 192"
          stroke="#ffffff"
          strokeOpacity="0.4"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Outer contour */}
        <path
          d={DROP_PATH}
          stroke="#ffffff"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          fill="none"
          filter={`url(#soft-${uid})`}
        />
      </svg>

      {showValue && hasValue && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-extrabold tabular-nums tracking-tight md:text-4xl"
            style={{ color: tone.ink }}
          >
            {hb.toFixed(decimals)}
          </span>
          <span
            className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: tone.ink, opacity: 0.65 }}
          >
            g/dL
          </span>
        </div>
      )}
    </motion.div>
  );
}
