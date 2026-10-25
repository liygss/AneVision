import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, ImageIcon, Check, Eye, Hand, AlertCircle } from "lucide-react";
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
  tag?: { label: string; tone: "required" | "recommended" };
}

const ACCEPTED = "image/jpeg,image/png,image/webp";
const ACCEPTED_TYPES = ACCEPTED.split(",");
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadCard({
  title,
  description,
  icon,
  file,
  onFileSelect,
  onFileRemove,
  tag,
}: UploadCardProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);

  const handleFile = useCallback(
    (f: File) => {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setSelectError("Format file tidak didukung. Gunakan JPG, PNG, atau WEBP.");
        return;
      }
      if (f.size > MAX_SIZE_BYTES) {
        setSelectError("Ukuran gambar melebihi 10 MB. Pilih gambar yang lebih kecil.");
        return;
      }
      setSelectError(null);
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
      // reset so picking the same file again still fires change
      e.target.value = "";
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    onFileRemove();
    setPreview(null);
    setSelectError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }, [onFileRemove]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative bg-white rounded-2xl border overflow-hidden transition-smooth shadow-[0_1px_2px_rgba(16,42,67,0.04),0_10px_30px_-18px_rgba(16,42,67,0.16)]",
        file
          ? "border-emerald-200 shadow-[0_1px_2px_rgba(16,42,67,0.04),0_12px_32px_-18px_rgba(16,185,129,0.35)]"
          : "border-navy-100/70 hover:border-primary-200"
      )}
    >
      {/* Header */}
      <div className={cn(
        "px-5 py-4 border-b transition-smooth",
        file ? "border-emerald-100/60" : "border-navy-100/50"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center transition-smooth ring-1",
            file
              ? "bg-emerald-50 ring-emerald-100"
              : "bg-gradient-to-br from-primary-50 to-primary-100 ring-primary-100/70"
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
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="text-[15px] font-bold leading-snug text-navy-900">{title}</h3>
              {tag && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-bold leading-normal",
                    tag.tone === "required"
                      ? "border-primary-200 bg-primary-50 text-primary-700"
                      : "border-navy-200 bg-navy-100/70 text-navy-600"
                  )}
                >
                  {tag.label}
                </span>
              )}
            </div>
            <p className="text-xs leading-relaxed text-navy-500 mt-1 line-clamp-2">{description}</p>
          </div>
          {file && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex-shrink-0">
              Siap
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
                  className="w-full h-52 sm:h-56 object-cover"
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
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm ring-1 ring-emerald-100">
                    <Check className="w-3.5 h-3.5" />
                    Terunggah
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-navy-500 truncate max-w-[70%]">{file.name}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 transition-base"
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
                "border-2 border-dashed rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-smooth min-h-[260px]",
                dragOver
                  ? "border-primary-400 bg-primary-50/50 scale-[1.01]"
                  : "border-navy-200/80 hover:border-primary-300 hover:bg-primary-50/20"
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

              <p className="text-sm font-semibold text-navy-800 mb-1">
                {dragOver ? (
                  <span className="text-primary-600">Lepaskan gambar di sini</span>
                ) : (
                  <>Seret gambar ke sini atau{" "}
                    <span className="text-primary-600">pilih file</span></>
                )}
              </p>
              <p className="text-xs text-navy-500 mb-5">
                JPG, PNG, atau WEBP (maks 10 MB)
              </p>

              <div className="flex gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-navy-50 text-navy-700 text-xs font-semibold hover:bg-navy-100 transition-base active:scale-[0.97]"
                >
                  <ImageIcon className="w-4 h-4" />
                  Galeri
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    cameraInputRef.current?.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-primary-50 text-primary-700 border border-primary-100 text-xs font-semibold hover:bg-primary-100 transition-base active:scale-[0.97]"
                >
                  <Camera className="w-4 h-4" />
                  Kamera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectError && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{selectError}</span>
          </motion.div>
        )}

        <input ref={fileInputRef} type="file" accept={ACCEPTED} onChange={handleChange} className="hidden" />
        <input ref={cameraInputRef} type="file" accept={ACCEPTED} capture="environment" onChange={handleChange} className="hidden" />
      </div>
    </motion.div>
  );
}
