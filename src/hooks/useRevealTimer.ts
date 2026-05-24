import { useCallback, useEffect, useRef, useState } from "react";

const REVEAL_DURATION_MS = 10000;

/**
 * Shared reveal-with-auto-hide timer for secret/password fields.
 * Reveals for 10s then automatically hides. No visible countdown — just state.
 */
export function useRevealTimer(durationMs: number = REVEAL_DURATION_MS) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clear();
    setRevealed(false);
  }, [clear]);

  const reveal = useCallback(() => {
    clear();
    setRevealed(true);
    timerRef.current = setTimeout(() => {
      setRevealed(false);
      timerRef.current = null;
    }, durationMs);
  }, [clear, durationMs]);

  const toggle = useCallback(() => {
    setRevealed((prev) => {
      clear();
      if (prev) return false;
      timerRef.current = setTimeout(() => {
        setRevealed(false);
        timerRef.current = null;
      }, durationMs);
      return true;
    });
  }, [clear, durationMs]);

  useEffect(() => clear, [clear]);

  return { revealed, reveal, hide, toggle };
}
