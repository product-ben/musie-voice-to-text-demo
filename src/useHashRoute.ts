import { useEffect, useState } from "react";

/**
 * Hash routing rather than the History API: GitHub Pages serves static files,
 * so a real path like /lab would 404 on reload. "#/lab" always works.
 */
export function useHashRoute(): string {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#/, "") || "/");

  useEffect(() => {
    const update = () => setRoute(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route;
}
