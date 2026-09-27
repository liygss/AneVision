import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const BUTTON_BASE =
  "group inline-flex items-center justify-center gap-2 rounded-xl font-bold text-sm transition-smooth active:scale-[0.98] hover:-translate-y-0.5"

export function buttonStyles(variant: "primary" | "secondary" | "light" = "primary") {
  if (variant === "secondary") {
    return cn(
      BUTTON_BASE,
      "w-full sm:w-auto bg-white text-navy-700 border border-navy-200 hover:border-primary-300 hover:bg-primary-50/40 hover:text-navy-900",
    )
  }
  if (variant === "light") {
    return cn(
      BUTTON_BASE,
      "sheen w-full sm:w-auto bg-white text-primary-700 shadow-lg shadow-navy-950/20 hover:bg-primary-50 hover:shadow-xl",
    )
  }
  return cn(
    BUTTON_BASE,
    "sheen w-full sm:w-auto bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-600/25 hover:from-primary-700 hover:to-primary-800 hover:shadow-xl",
  )
}

async function shrinkHeatmap(base64: string, maxWidth = 360): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement("canvas")
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext("2d")
      if (!ctx) return resolve(null)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL("image/png").split(",")[1] || null)
    }
    img.onerror = () => resolve(null)
    img.src = `data:image/png;base64,${base64}`
  })
}

export async function slimPrediction<T>(result: T): Promise<T> {
  const explanation = (result as { explanation?: { eye_heatmap?: string | null; nail_heatmap?: string | null } }).explanation
  if (!explanation) return result
  const [eye, nail] = await Promise.all([
    explanation.eye_heatmap ? shrinkHeatmap(explanation.eye_heatmap) : Promise.resolve(null),
    explanation.nail_heatmap ? shrinkHeatmap(explanation.nail_heatmap) : Promise.resolve(null),
  ])
  return {
    ...result,
    explanation: { ...explanation, eye_heatmap: eye, nail_heatmap: nail },
  }
}
