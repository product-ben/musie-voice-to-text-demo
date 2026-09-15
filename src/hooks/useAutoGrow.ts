import { useCallback, useEffect, type RefObject } from "react";

/** Never smaller than this, so an emptied box does not collapse to a sliver. */
const MIN_ROWS = 2;

/** Past this the box scrolls instead of pushing the buttons off screen. */
const MAX_VIEWPORT_FRACTION = 0.4;

/**
 * Keeps a textarea exactly as tall as its content.
 *
 * Height is measured rather than estimated from character count, so wrapping,
 * pasted text, newlines and different fonts all behave. Recomputed on resize
 * and orientation change, since the wrap point moves with the width.
 */
export function useAutoGrow(ref: RefObject<HTMLTextAreaElement | null>, value: string) {
  const resize = useCallback(() => {
    const element = ref.current;
    if (!element) return;

    const styles = window.getComputedStyle(element);
    const lineHeight = parseFloat(styles.lineHeight) || 20;
    const vertical =
      parseFloat(styles.paddingTop) +
      parseFloat(styles.paddingBottom) +
      parseFloat(styles.borderTopWidth) +
      parseFloat(styles.borderBottomWidth);

    // Collapse first, or scrollHeight can only ever grow.
    element.style.height = "auto";

    const min = lineHeight * MIN_ROWS + vertical;
    const max = window.innerHeight * MAX_VIEWPORT_FRACTION;
    const wanted = element.scrollHeight + parseFloat(styles.borderTopWidth) +
      parseFloat(styles.borderBottomWidth);

    const height = Math.min(Math.max(wanted, min), max);
    element.style.height = `${height}px`;
    element.style.overflowY = wanted > max ? "auto" : "hidden";
  }, [ref]);

  // Runs on every value change, which covers typing, pasting and cut.
  useEffect(resize, [resize, value]);

  useEffect(() => {
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
    };
  }, [resize]);

  return resize;
}
