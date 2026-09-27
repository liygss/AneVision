import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ImageIcon, Check, Eye, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import EyeArt from "./EyeArt";
import NailArt from "./NailArt";

interface UploadCardProps {
  title: string;
  description: string;
  icon: "eye" | "nail";
  file: File | null;
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
}

const ACCEPTED = "image/jpeg,image/png,image/webp";

export default function UploadCard({
  title,
  description,
  icon,
  file,
  onFileSelect,
  onFileRemove,
}: UploadCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith("image/")) return;
      onFileSelect(f);
      const url = URL.createObjectURL(f);
      setPreview(url);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    onFileRemove();
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [onFileRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative bg-white rounded-2xl border shadow-sm overflow-hidden transition-smooth",
        file
          ? "border-emerald-200 shadow-emerald-100/40"
          : "border-navy-100/60 hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-5 py-4 border-b transition-smooth",
        file ? "border-emerald-100/50" : "border-navy-50/50"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-smooth",
            file
              ? "bg-emerald-50"
              : "bg-gradient-to-br from-primary-50 to-primary-100"
          )}>
            {file ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <Check className="w-5 h-5 text-emerald-600" />
              </motion.div>
            ) : icon === "eye" ? (
              <Eye className="w-5 h-5 text-primary-600" />
            ) : (
              <Hand className="w-5 h-5 text-primary-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-navy-900">{title}</h3>
            <p className="text-[11px] text-navy-500 mt-0.5 truncate">{description}</p>
          </div>
          {file && (
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
              ✓ Siap
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {preview && file ? (
            /* ============ PREVIEW STATE ============ */
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="relative group"
            >
              <div className="relative overflow-hidden rounded-xl border border-navy-100/60">
                <img
                  src={preview}
                  alt={`Pratinjau ${icon === "eye" ? "mata" : "kuku"}`}
                  className="w-full h-48 sm:h-52 object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/20 rounded-xl transition-smooth flex items-center justify-center opacity-0 group-hover:opacity-100 max-md:opacity-100">
                  <button
                    onClick={handleRemove}
                    className="bg-white/90 backdrop-blur-sm text-danger p-2.5 rounded-xl shadow-lg hover:bg-white hover:scale-110 transition-smooth"
                    aria-label="Hapus gambar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {/* Scan line */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-0 group-hover:opacity-50 animate-scan-line" />
                </div>
                {/* Success badge */}
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                    <Check className="w-3 h-3" />
                    Terunggah
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-navy-500 truncate max-w-[70%]">{file.name}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-base"
                >
                  Ganti
                </button>
              </div>
            </motion.div>
          ) : (
            /* ============ EMPTY STATE ============ */
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-smooth min-h-[240px]",
                dragOver
                  ? "border-primary-400 bg-primary-50/40 scale-[1.01]"
                  : "border-navy-200/80 hover:border-primary-300 hover:bg-primary-50/15"
              )}
            >
              {/* Illustration */}
              <motion.div
                animate={dragOver ? { scale: 1.08, y: -3 } : { scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mb-5 relative"
              >
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center transition-smooth",
                  dragOver ? "bg-primary-100" : "bg-gradient-to-br from-primary-50 to-primary-100"
                )}>
                  {icon === "eye" ? (
                    <EyeArt className="w-14 h-14" animate={false} />
                  ) : (
                    <NailArt className="w-14 h-14" animate={false} />
                  )}
                </div>
                {/* Pulse ring */}
                <div className="absolute -inset-2.5 bg-primary-200/12 rounded-2xl animate-pulse-ring pointer-events-none" />
              </motion.div>

              <p className="text-sm font-medium text-navy-700 mb-1">
                {dragOver ? (
                  <span className="text-primary-600 font-semibold">Lepaskan gambar di sini</span>
                ) : (
                  <>Seret gambar ke sini atau{" "}
                    <span className="text-primary-600 font-semibold">pilih file</span></>
                )}
              </p>
              <p className="text-xs text-navy-500 mb-5">
                JPG, PNG, atau WEBP (maks 10 MB)
              </p>

              <div className="flex gap-2 w-full max-w-xs">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-50 text-navy-700 text-xs font-medium hover:bg-navy-100 transition-base active:scale-[0.97]"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Galeri
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-navy-50 text-navy-700 text-xs font-medium hover:bg-navy-100 transition-base active:scale-[0.97]"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Kamera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={handleChange} className="hidden" />
        <input ref={cameraInputRef} type="file" accept={ACCEPTED} capture="environment" onChange={handleChange} className="hidden" />
      </div>
    </motion.div>
  );
}
