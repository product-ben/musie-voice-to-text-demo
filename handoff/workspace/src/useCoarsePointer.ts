import { useEffect, useState } from "react";

const QUERY = "(pointer: coarse)";

/**
 * True when the primary pointer is a finger rather than a cursor.
 *
 * Icon Button's `size` is the system's own lever for the target, so the choice
 * is made here and passed as a prop rather than by overriding the component's
 * internal `--musy-icon-btn-size`. Foundations §5.4 keeps `--target-min` (24px)
 * for inline controls in prose; the card's controls are its only affordances,
 * so on touch they step up to `--target-primary`.
 */
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(() => window.matchMedia(QUERY).matches);

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const update = () => setCoarse(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return coarse;
}
