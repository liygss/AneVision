import { motion } from "framer-motion";

interface NailArtProps {
  className?: string;
  animate?: boolean;
}

export default function NailArt({ className = "", animate = true }: NailArtProps) {
  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, scale: 0.9 } : undefined}
      animate={animate ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="nailGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="nailBedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0fdfa" />
            <stop offset="100%" stopColor="#cffafe" />
          </linearGradient>
          <filter id="nailShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0891b2" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* Finger shape */}
        <rect x="65" y="60" width="70" height="120" rx="35" fill="#f0f4f8" stroke="#d9e2ec" strokeWidth="1.5" filter="url(#nailShadow)" />

        {/* Nail plate */}
        <path
          d="M75 55 Q75 30, 100 30 Q125 30, 125 55 L125 95 Q125 110, 100 110 Q75 110, 75 95 Z"
          fill="url(#nailBedGrad)"
          stroke="url(#nailGrad)"
          strokeWidth="2.5"
        />

        {/* Nail bed pink undertone */}
        <path
          d="M80 58 Q80 42, 100 42 Q120 42, 120 58 L120 85 Q120 100, 100 100 Q80 100, 80 85 Z"
          fill="#f0fdfa"
          opacity="0.7"
        />

        {/* Lunula (half moon) */}
        <path
          d="M85 58 Q100 48, 115 58"
          fill="none"
          stroke="#d9e2ec"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Nail shine */}
        <path
          d="M88 40 Q90 35, 95 35"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* Cuticle line */}
        <path
          d="M75 55 Q100 50, 125 55"
          fill="none"
          stroke="#0891b2"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
        />

        {/* Finger joints */}
        <line x1="75" y1="100" x2="125" y2="100" stroke="#d9e2ec" strokeWidth="1" opacity="0.5" />
        <line x1="75" y1="120" x2="125" y2="120" stroke="#d9e2ec" strokeWidth="1" opacity="0.3" />

        {/* Scan line effect */}
        <motion.line
          x1="80" y1="55" x2="120" y2="55"
          stroke="#22d3ee"
          strokeWidth="1.5"
          opacity="0.6"
          strokeLinecap="round"
          initial={{ y1: 35, y2: 35 }}
          animate={{ y1: [35, 105, 35], y2: [35, 105, 35] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />

        {/* Data points */}
        {[
          { cx: 90, cy: 65, delay: 0 },
          { cx: 110, cy: 75, delay: 0.3 },
          { cx: 95, cy: 85, delay: 0.6 },
        ].map((pt, i) => (
          <motion.circle
            key={i}
            cx={pt.cx}
            cy={pt.cy}
            r="2"
            fill="#0891b2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: pt.delay, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </motion.div>
  );
}
