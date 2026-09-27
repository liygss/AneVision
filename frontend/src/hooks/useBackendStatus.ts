import { useCallback, useEffect, useState } from "react";
import { checkHealth, type BackendState } from "@/services/api";

/**
 * Probes the API once on mount. Kept out of the component file so that
 * fast-refresh works (a module that exports both a hook and a component
 * breaks it).
 */
export function useBackendStatus(): { state: BackendState; retry: () => void } {
  const [state, setState] = useState<BackendState>("checking");

  const probe = useCallback(() => {
    setState("checking");
    checkHealth().then((ok) => setState(ok ? "online" : "offline"));
  }, []);

  useEffect(() => {
    probe();
  }, [probe]);

  return { state, retry: probe };
}

export type { BackendState };
