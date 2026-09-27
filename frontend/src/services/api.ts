import type { PredictionResult } from "@/types/prediction";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export interface NailBoxCoords {
  l: number;
  t: number;
  r: number;
  b: number;
}

export type BackendState = "checking" | "online" | "offline";

/** Thrown when the API host cannot be reached at all (DNS, CORS, no route). */
export class BackendUnreachableError extends Error {
  constructor(message = "Server analisis tidak dapat dihubungi.") {
    super(message);
    this.name = "BackendUnreachableError";
  }
}

/**
 * A static SPA host (e.g. Vercel without an /api rewrite) answers unknown
 * paths with index.html and HTTP 200. Treating that as a healthy API is the
 * classic way a frontend silently pretends to be connected, so the
 * content-type is always verified.
 */
function looksLikeJson(response: Response): boolean {
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json");
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new BackendUnreachableError();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || "Prediksi gagal. Silakan coba lagi.");
  }

  if (!looksLikeJson(response)) {
    // index.html came back instead of the API: no /api rewrite is configured.
    throw new BackendUnreachableError(
      "Endpoint analisis tidak tersedia di host ini."
    );
  }

  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return false;
    if (!looksLikeJson(response)) return false;
    const data = await response.json();
    return data?.status === "ok";
  } catch {
    return false;
  }
}
