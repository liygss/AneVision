import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, Crop, RotateCcw, Check } from "lucide-react";

export interface NailBox {
  l: number;
  t: number;
  r: number;
  b: number;
}

interface Props {
  file: File;
  onConfirm: (box: NailBox) => void;
  onCancel: () => void;
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export default function NailBoxCrop({ file, onConfirm, onCancel }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [current, setCurrent] = useState<Rect | null>(null);
  const [box, setBox] = useState<Rect | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const clampInside = (x: number, y: number) => {
    const el = wrapRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: Math.min(Math.max(0, x - r.left), r.width),
      y: Math.min(Math.max(0, y - r.top), r.height),
    };
  };

  const onDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragStart.current = clampInside(e.clientX, e.clientY);
    setBox(null);
    setCurrent({ x0: dragStart.current.x, y0: dragStart.current.y, x1: dragStart.current.x + 1, y1: dragStart.current.y + 1 });
  };

  const onMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const p = clampInside(e.clientX, e.clientY);
    setCurrent({
      x0: dragStart.current.x,
      y0: dragStart.current.y,
      x1: p.x,
      y1: p.y,
    });
  };

  const onUp = () => {
    if (!dragStart.current || !current) {
      dragStart.current = null;
      return;
    }
    const { x0, y0, x1, y1 } = current;
    const rect = {
      x0: Math.min(x0, x1),
      y0: Math.min(y0, y1),
      x1: Math.max(x0, x1),
      y1: Math.max(y0, y1),
    };
    dragStart.current = null;
    if (rect.x1 - rect.x0 < 12 || rect.y1 - rect.y0 < 12) {
      setBox(null);
      setCurrent(null);
      return;
    }
    setBox(rect);
    setCurrent(null);
  };

  const confirm = () => {
    const el = wrapRef.current;
    if (!el || !box) {
      onCancel();
      return;
    }
    const r = el.getBoundingClientRect();
    if (!(r.width > 0) || !(r.height > 0)) {
      onCancel();
      return;
    }
    const l = box.x0 / r.width;
    const t = box.y0 / r.height;
    const rr = box.x1 / r.width;
    const bb = box.y1 / r.height;
    if (![l, t, rr, bb].every(Number.isFinite)) {
      onCancel();
      return;
    }
    onConfirm({ l, t, r: rr, b: bb });
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" onClick={onCancel} />

      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="relative glass-strong rounded-3xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Crop className="w-4 h-4 text-primary-600" />
              Tandai Area Kuku
            </h3>
            <p className="text-xs text-navy-500 mt-1">
              Seret untuk membuat kotak tepat mengelilingi kuku (sertakan sedikit kulit di sekitarnya).
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg bg-navy-50 text-navy-600 hover:bg-navy-100 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          ref={wrapRef}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={() => {
            if (dragStart.current) {
              dragStart.current = null;
              setCurrent(null);
            }
          }}
          className="relative inline-block w-full cursor-crosshair rounded-xl overflow-hidden border border-navy-100 select-none"
          style={{ touchAction: "none" }}
        >
          {url && (
            <img src={url} alt="Pilih area kuku" className="w-full h-auto block" draggable={false} />
          )}

          {(current || box) && (
            <div
              className="absolute border-2 border-primary-400 bg-primary-400/15 pointer-events-none"
              style={{
                left: (current?.x0 ?? box!.x0),
                top: (current?.y0 ?? box!.y0),
                width: ((current?.x1 ?? box!.x1) - (current?.x0 ?? box!.x0)),
                height: ((current?.y1 ?? box!.y1) - (current?.y0 ?? box!.y0)),
              }}
            >
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] bg-primary-600 text-white px-1.5 py-0.5 rounded" style={{ whiteSpace: "nowrap" }}>
                KUKU
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              setBox(null);
              setCurrent(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-navy-500 bg-navy-50 hover:bg-navy-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Tandai ulang
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-navy-600 bg-navy-50 hover:bg-navy-100 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={confirm}
              disabled={!box}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                box
                  ? "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-600/30 hover:-translate-y-0.5"
                  : "bg-navy-100 text-navy-400 cursor-not-allowed"
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              Gunakan area ini
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}