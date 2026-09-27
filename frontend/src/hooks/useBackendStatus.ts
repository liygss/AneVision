import { useCallback, useEffect, useRef, useState } from "react";
import { checkHealth, type BackendState } from "@/services/api";

/**
 * Probes the API on mount, and keeps retrying with a growing backoff while it
 * is unreachable. On a serverless host the first request wakes the instance and
 * has to load every model, which routinely takes 30-60s; a single probe at mount
 * would leave the page claiming the backend is down for that whole window.
 */
const RETRY_DELAYS_MS = [4000, 9000, 16000, 25000, 35000];
const MAX_PROBE_TIME_MS = 120_000;

export function useBackendStatus(): { state: BackendState; retry: () => void } {
  const [state, setState] = useState<BackendState>("checking");
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
        setState("online");
        return;
      }
      // Still unreachable. Keep polling while the budget lasts, because the
      // usual cause is a cold start rather than a real outage.
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

  return { state, retry: probe };
}

export type { BackendState };
