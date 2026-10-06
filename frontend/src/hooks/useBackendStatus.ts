import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkHealth,
  describeModelProblem,
  getModelStatus,
  type BackendState,
  type ModelStatus,
} from "@/services/api";

/**
 * Probes the API on mount, and keeps retrying with a growing backoff while it
 * is unreachable. On a serverless host the first request wakes the instance and
 * has to load every model, which routinely takes 30-60s; a single probe at mount
 * would leave the page claiming the backend is down for that whole window.
 */
const RETRY_DELAYS_MS = [4000, 9000, 16000, 25000, 35000];
const MAX_PROBE_TIME_MS = 120_000;

export interface BackendStatus {
  state: BackendState;
  /** Set when the API answers but the models did not load. */
  modelProblem: string | null;
  models: ModelStatus | null;
  retry: () => void;
}

export function useBackendStatus(): BackendStatus {
  const [state, setState] = useState<BackendState>("checking");
  const [models, setModels] = useState<ModelStatus | null>(null);
  const attemptRef = useRef(0);
  const startedRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const probe = useCallback(function run(): void {
    if (stoppedRef.current) return;
    startedRef.current = performance.now();
    attemptRef.current = 0;
    setState("checking");

    void checkHealth().then((ok) => {
      if (stoppedRef.current) return;

      if (ok) {
        const status = getModelStatus();
        setModels(status);
        // Reachable but unusable: treat as a failure so the user is told the
        // real reason now, not after uploading a photo.
        setState(status && !status.eye_loaded ? "degraded" : "online");
        return;
      }

      const elapsed = performance.now() - startedRef.current;
      const next = attemptRef.current++;
      if (elapsed < MAX_PROBE_TIME_MS && next < RETRY_DELAYS_MS.length) {
        timerRef.current = window.setTimeout(run, RETRY_DELAYS_MS[next]);
      } else {
        setState("offline");
      }
    });
  }, []);

  useEffect(() => {
    stoppedRef.current = false;
    probe();
    return () => {
      stoppedRef.current = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [probe]);

  return {
    state,
    models,
    modelProblem: models ? describeModelProblem(models) : null,
    retry: probe,
  };
}

export type { BackendState };
