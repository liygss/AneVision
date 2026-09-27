import type { PredictionResult } from "@/types/prediction";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export interface NailBoxCoords {
  l: number;
  t: number;
  r: number;
  b: number;
}

export async function analyzeImages(
  eyeImage: File,
  nailImage: File | null,
  gender: string = "F",
  nailBox?: NailBoxCoords | null
): Promise<PredictionResult> {
  const formData = new FormData();
  formData.append("eye_image", eyeImage);
  if (nailImage) {
    formData.append("nail_image", nailImage);
  }
  formData.append("gender", gender);
  if (nailBox) {
    const round = (v: number) => Math.round(v * 10000) / 10000;
    formData.append(
      "nail_box",
      `${round(nailBox.l)},${round(nailBox.t)},${round(nailBox.r)},${round(nailBox.b)}`
    );
  }

  const response = await fetch(`${API_BASE}/predict`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || "Prediksi gagal. Silakan coba lagi.");
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
