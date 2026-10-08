import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, ScanSearch, HeartPulse, TrendingUp, ShieldCheck } from "lucide-react";

interface PhotoCardProps {
  src: string;
  alt: string;
  icon: ReactNode;
  label: string;
  dotClass: string;
  position: string;
  aspect: string;
  loading: "eager" | "lazy";
  objectPosition?: string;
  initialRotate: number;
  delay: number;
  children?: ReactNode;
}

function PhotoCard({
  src,
  alt,
  icon,
  label,
  dotClass,
  position,
  aspect,
  loading,
  objectPosition,
  initialRotate,
  delay,
  children,
}: PhotoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, rotate: initialRotate }}
      animate={{ opacity: 1, y: 0, rotate: initialRotate }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={position}
    >
      <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-white/60 shadow-xl shadow-navy-900/10 card-hover">
        <img
          src={src}
          alt={alt}
          className={`w-full ${aspect} object-cover transition-transform duration-500 group-hover:scale-105`}
          style={objectPosition ? { objectPosition } : undefined}
          loading={loading}
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundSize: "128px",
          }}
        />
        <div className="absolute top-3 left-3">
          <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white">
            {icon}
          </div>
        </div>
        <div className="absolute bottom-0 inset-x-0 p-3">
          <div className="flex items-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            <p className="text-[10px] sm:text-xs font-bold text-white/95 uppercase tracking-wider">
              {label}
            </p>
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

export default function HeroPhotoGrid() {
  return (
    <div className="relative w-full h-[440px] sm:h-[500px] md:h-[540px]">
      {/* Ambient glow */}
      <div className="absolute -inset-8 sm:-inset-12 bg-gradient-to-tr from-primary-200/30 via-primary-100/20 to-cyan-200/25 rounded-[3rem] blur-2xl pointer-events-none" />

      {/* Decorative conic ring */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105%] aspect-square rounded-full border border-primary-200/60"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(8,145,178,0.10), rgba(34,211,238,0.05), rgba(8,145,178,0.10), rgba(34,211,238,0.05), rgba(8,145,178,0.10))",
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] aspect-square rounded-full border border-dashed border-primary-300/30 animate-spin-slow" />
      </div>

      <PhotoCard
        src="/image/eye-exam.jpg"
        alt="Pemeriksaan mata untuk skrining anemia"
        icon={<Eye className="w-3.5 h-3.5" />}
        label="Citra Konjungtiva"
        dotClass="bg-emerald-400"
        position="absolute top-6 left-2 sm:left-4 w-[210px] sm:w-[240px] md:w-[260px] z-10 animate-float"
        aspect="aspect-[4/5]"
        loading="eager"
        initialRotate={-3}
        delay={0.2}
      >
        <div className="absolute inset-0 overflow-hidden rounded-2xl sm:rounded-3xl pointer-events-none">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-300/90 to-transparent animate-scan-line" />
        </div>
        <div className="absolute top-3 right-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
        </div>
      </PhotoCard>

      <PhotoCard
        src="/image/smartphone-health.jpg"
        alt="Skrining anemia melalui smartphone"
        icon={<ScanSearch className="w-3.5 h-3.5" />}
        label="Skrining via HP"
        dotClass="bg-primary-300"
        position="absolute top-0 right-0 sm:right-4 w-[170px] sm:w-[190px] md:w-[205px] z-20 animate-float-slow"
        aspect="aspect-square"
        loading="lazy"
        initialRotate={2.5}
        delay={0.35}
      />

      <PhotoCard
        src="/image/doctor-consult.jpg"
        alt="Konsultasi dengan tenaga kesehatan"
        icon={<HeartPulse className="w-3.5 h-3.5" />}
        label="Konsultasi Medis"
        dotClass="bg-emerald-400"
        position="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 w-[195px] sm:w-[220px] md:w-[240px] z-30 animate-float-delay"
        aspect="aspect-[4/3]"
        loading="lazy"
        objectPosition="center top"
        initialRotate={-1}
        delay={0.5}
      />

      {/* Floating metric chip: Hb result */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-14 right-1 sm:right-3 z-40 animate-float-delay"
      >
        <div className="glass-strong rounded-2xl border border-white/70 shadow-lg shadow-navy-900/15 p-3 min-w-[132px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-navy-500">Est. Hemoglobin</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-lg font-extrabold text-navy-900 tabular-nums">13.2</span>
            <span className="text-[10px] font-bold text-navy-400">g/dL</span>
          </div>
          <span className="inline-flex mt-1 items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50/80 border border-emerald-200/70 rounded-full px-1.5 py-0.5">
            Risk: Normal
          </span>
        </div>
      </motion.div>

      {/* Floating metric chip: status */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-1/2 -left-2 sm:left-2 z-40 animate-float"
      >
        <div className="glass-strong rounded-full border border-white/70 shadow-lg shadow-navy-900/15 pl-2 pr-3 py-1.5 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-300/60 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5" />
          </span>
          <div>
            <p className="text-[10px] font-bold text-navy-800 leading-tight">AI Menganalisis</p>
            <p className="text-[9px] text-navy-500 leading-tight">2 model · <span className="font-bold text-emerald-600">aktif</span></p>
          </div>
        </div>
      </motion.div>

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="absolute -bottom-2 sm:bottom-2 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="glass-strong rounded-full border border-white/70 shadow-lg shadow-navy-900/10 px-4 py-1.5 flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <p className="text-[10px] sm:text-xs font-bold text-navy-800">Skrining Non-Invasif</p>
        </div>
      </motion.div>
    </div>
  );
}
