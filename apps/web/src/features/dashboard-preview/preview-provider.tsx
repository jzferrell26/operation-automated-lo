"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LiveRegion } from "@oalo/ui";
import {
  initialPreviewState,
  PREVIEW_STORAGE_KEY,
  previewStateSchema,
  type PreviewState,
} from "./model.js";

type PreviewContextValue = {
  state: PreviewState;
  ready: boolean;
  error: string | null;
  save: (change: (current: PreviewState) => PreviewState) => boolean;
  reset: () => boolean;
};
const PreviewContext = createContext<PreviewContextValue | null>(null);

export function DashboardPreviewProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialPreviewState);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readable, setReadable] = useState(true);
  useEffect(() => {
    function read() {
      try {
        const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
        if (raw && raw.length > 2_000_000) throw new Error("Preview data exceeds its limit");
        const next =
          raw === null ? initialPreviewState() : previewStateSchema.parse(JSON.parse(raw));
        current.current = next;
        setState(next);
        setReadable(true);
        setError(null);
      } catch {
        setReadable(false);
        setError(
          "Saved preview data could not be opened. Enable browser storage or reset the preview in Settings. Your saved records have not been replaced.",
        );
      }
      setReady(true);
    }
    read();
    const onStorage = (event: StorageEvent) => {
      if (event.key === PREVIEW_STORAGE_KEY || event.key === null) read();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback(
    (change: (value: PreviewState) => PreviewState) => {
      if (!ready || !readable) return false;
      try {
        // Read the newest tab's data before applying a change. No server filesystem is involved.
        const raw = localStorage.getItem(PREVIEW_STORAGE_KEY);
        const latest = raw === null ? current.current : previewStateSchema.parse(JSON.parse(raw));
        const next = previewStateSchema.parse(change(latest));
        localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(next));
        current.current = next;
        setState(next);
        setError(null);
        return true;
      } catch {
        setError(
          "This change was not saved. Check browser storage and try again. Preview storage supports up to 50 campaigns and 50 partners.",
        );
        return false;
      }
    },
    [ready, readable],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(PREVIEW_STORAGE_KEY);
      const next = initialPreviewState();
      current.current = next;
      setState(next);
      setReadable(true);
      setError(null);
      return true;
    } catch {
      setError("Preview data could not be reset. Check this browser's storage settings.");
      return false;
    }
  }, []);

  return (
    <PreviewContext.Provider value={{ state, ready, error, save, reset }}>
      {error ? <LiveRegion urgency="alert" visible message={error} /> : null}
      {children}
    </PreviewContext.Provider>
  );
}

export function useDashboardPreview() {
  return useContext(PreviewContext);
}
export function useRequiredDashboardPreview() {
  const value = useDashboardPreview();
  if (!value) throw new Error("Dashboard preview requires its own provider");
  return value;
}
