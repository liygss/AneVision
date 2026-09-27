import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Eye, ScanSearch, HeartPulse } from "lucide-react";

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
      </div>
    </motion.div>
  );
}

export default function HeroPhotoGrid() {
  return (
    <div className="relative w-full h-[420px] sm:h-[480px] md:h-[520px]">
      {/* Ambient glow */}
      <div className="absolute -inset-6 sm:-inset-8 bg-gradient-to-tr from-primary-200/25 via-primary-100/15 to-primary-50/25 rounded-[2.5rem] blur-2xl pointer-events-none" />

      <PhotoCard
        src="/image/eye-exam.jpg"
        alt="Pemeriksaan mata untuk skrining anemia"
        icon={<Eye className="w-3.5 h-3.5" />}
        label="Citra Konjungtiva"
        dotClass="bg-emerald-400"
        position="absolute top-6 left-2 sm:left-4 w-[210px] sm:w-[240px] md:w-[260px] z-10"
        aspect="aspect-[4/5]"
        loading="eager"
        initialRotate={-3}
        delay={0.2}
      />

      <PhotoCard
        src="/image/smartphone-health.jpg"
        alt="Skrining anemia melalui smartphone"
        icon={<ScanSearch className="w-3.5 h-3.5" />}
        label="Skrining via HP"
        dotClass="bg-primary-300"
        position="absolute top-0 right-0 sm:right-4 w-[170px] sm:w-[190px] md:w-[205px] z-20"
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
        position="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 w-[195px] sm:w-[220px] md:w-[240px] z-30"
        aspect="aspect-[4/3]"
        loading="lazy"
        objectPosition="center top"
        initialRotate={-1}
        delay={0.5}
      />

      {/* Floating badge */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.9 }}
        className="absolute -bottom-2 sm:bottom-0 left-1/2 -translate-x-1/2 z-40"
      >
        <div className="glass-strong rounded-full border border-white/70 shadow-lg shadow-navy-900/10 px-4 py-1.5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className="text-[10px] sm:text-xs font-bold text-navy-800">Skrining Non-Invasif</p>
        </div>
      </motion.div>
    </div>
  );
}
