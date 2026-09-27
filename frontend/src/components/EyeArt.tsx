import { motion } from "framer-motion";

interface EyeArtProps {
  className?: string;
  animate?: boolean;
}

export default function EyeArt({ className = "", animate = true }: EyeArtProps) {
  return (
    <motion.div
      className={className}
      initial={animate ? { opacity: 0, scale: 0.9 } : undefined}
      animate={animate ? { opacity: 1, scale: 1 } : undefined}
      transition={{ duration: 0.6 }}
    >
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <defs>
          <linearGradient id="eyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="irisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#155e75" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
          <filter id="eyeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#0891b2" floodOpacity="0.15"/>
          </filter>
        </defs>

        {/* Outer eye shape */}
        <path
          d="M30 100 C30 100, 100 40, 170 100 C170 100, 100 160, 30 100 Z"
          fill="url(#eyeGrad)"
          opacity="0.12"
          filter="url(#eyeShadow)"
        />
        <path
          d="M30 100 C30 100, 100 40, 170 100 C170 100, 100 160, 30 100 Z"
          stroke="url(#eyeGrad)"
          strokeWidth="2.5"
          fill="none"
        />

        {/* Sclera */}
        <ellipse cx="100" cy="100" rx="42" ry="42" fill="white" stroke="#e2e8f0" strokeWidth="1"/>

        {/* Iris */}
        <circle cx="100" cy="100" r="28" fill="url(#irisGrad)" />

        {/* Pupil */}
        <circle cx="100" cy="100" r="12" fill="#0a1929" />

        {/* Light reflection */}
        <circle cx="108" cy="92" r="5" fill="white" opacity="0.8" />
        <circle cx="94" cy="106" r="3" fill="white" opacity="0.5" />

        {/* Iris detail rings */}
        <circle cx="100" cy="100" r="22" fill="none" stroke="#155e75" strokeWidth="0.5" opacity="0.4" />
        <circle cx="100" cy="100" r="16" fill="none" stroke="#164e63" strokeWidth="0.5" opacity="0.3" />

        {/* Eyelid lines */}
        <path d="M30 100 C30 100, 100 55, 170 100" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />
        <path d="M30 100 C30 100, 100 145, 170 100" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" />

        {/* Lower lid (conjunctiva line) */}
        <path d="M50 115 C70 130, 130 130, 150 115" fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />

        {/* Scan line effect */}
        <motion.line
          x1="60" y1="72" x2="140" y2="72"
          stroke="#22d3ee"
          strokeWidth="1.5"
          opacity="0.6"
          strokeLinecap="round"
          initial={{ y1: 60, y2: 60 }}
          animate={{ y1: [65, 135, 65], y2: [65, 135, 65] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}
