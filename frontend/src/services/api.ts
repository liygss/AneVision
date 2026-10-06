import type { PredictionResult } from "@/types/prediction";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export interface NailBoxCoords {
  l: number;
  t: number;
  r: number;
  b: number;
}

/**
 * "degraded" means the API answered but the models are not loaded: reachable
 * yet unusable, so it needs to be told apart from a healthy "online".
 */
export type BackendState = "checking" | "online" | "degraded" | "offline";

/** Mirrors the `models` block of GET /health. */
export interface ModelStatus {
  eye_loaded: boolean;
  eye_error: string | null;
  eye_dir_exists: boolean;
  nail_loaded: boolean;
  nail_error: string | null;
}

/**
 * Set when /health answers 200 but the models did not load. The API is
 * reachable in that case, so a plain reachability probe would report "online"
 * and the failure would only surface as a confusing "Eye model not loaded"
 * after the user has already picked a photo.
 */
let lastModelStatus: ModelStatus | null = null;

export function getModelStatus(): ModelStatus | null {
  return lastModelStatus;
}

export function describeModelProblem(status: ModelStatus): string | null {
  if (status.eye_loaded) return null;
  if (!status.eye_dir_exists) {
    return "Bobot model mata tidak ikut ter-deploy. Periksa apakah folder backend/models ikut masuk ke build Vercel.";
  }
  if (status.eye_error?.includes("missing model files")) {
    return `Bobot model mata tidak lengkap di server: ${status.eye_error.replace("missing model files: ", "")}`;
  }
  return `Model mata gagal dimuat di server: ${status.eye_error ?? "penyebab tidak diketahui"}.`;
}

/**
 * A cold start on a serverless host has to load every model, which can take
 * 30-60s. Without a timeout the fetch hangs and the Screening page looks
 * frozen, so probes are bounded and reported as "starting".
 */
export const HEALTH_PROBE_TIMEOUT_MS = 8000;
const PREDICT_TIMEOUT_MS = 120_000;

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
      signal: AbortSignal.timeout(PREDICT_TIMEOUT_MS),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new BackendUnreachableError(
        "Server terlalu lama menjawab. Model mungkin sedang dimuat, coba lagi sebentar lagi."
      );
    }
    throw new BackendUnreachableError();
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    // A 404 on the API path means the route does not exist on the host, which
    // is a routing problem (missing rewrite or a backend that serves a
    // different prefix), not a failed prediction. Reporting FastAPI's bare
    // "Not Found" to the user is useless, so it becomes a connectivity error.
    if (response.status === 404) {
      throw new BackendUnreachableError(
        `Endpoint ${API_BASE}/predict tidak ditemukan di host ini.`
      );
    }

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
      signal: AbortSignal.timeout(HEALTH_PROBE_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    if (!looksLikeJson(response)) return false;
    const data = await response.json();
    lastModelStatus = (data?.models ?? null) as ModelStatus | null;
    return data?.status === "ok";
  } catch {
    return false;
  }
}
