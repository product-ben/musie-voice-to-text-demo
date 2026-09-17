import { useCallback, useEffect, useState } from "react";

/** The key the design system's own theme-init.js owns. Reused, not replaced. */
const THEME_KEY = "musy-theme";

export type MusyTheme = "light" | "dark";

/**
 * Light/dark for the design-system page only.
 *
 * The system ships `tokens/theme-init.js`, which stamps `data-theme` on
 * `<html>` before first paint. That is right for an app that is Musy all the
 * way down; here the design system occupies one route of a plainly-styled
 * demo, and `color-scheme: dark` on `<html>` would repaint the other pages'
 * form controls and scrollbars too.
 *
 * So the attribute goes on this page's own wrapper instead. That is not a
 * second mechanism: foundations declares every token on `:root, [data-theme]`
 * precisely so a nested `[data-theme]` subtree recomputes `light-dark()`
 * against its own `color-scheme` (§12, "Nested theme override"). Same
 * attribute, same storage key, narrower scope.
 */
export function useMusyTheme(): [MusyTheme, () => void] {
  const [theme, setTheme] = useState<MusyTheme>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
    } catch {
      // Private mode and blocked site data both throw rather than return null.
      return "light";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* the page still works, the choice just does not survive a reload */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  }, []);

  return [theme, toggle];
}
