/**
 * Prefix a path with Vite's configured base (e.g. /moh-gfrt/ on GitHub Pages).
 * Use for public/ assets referenced from JSX. React Router Link/NavLink already
 * respect BrowserRouter basename — do not wrap those.
 */
export function assetUrl(path) {
  const base = import.meta.env.BASE_URL || "/";
  const cleaned = String(path || "").replace(/^\//, "");
  return `${base}${cleaned}`;
}

/** Router basename derived from Vite base (no trailing slash; undefined at root). */
export function routerBasename() {
  const base = import.meta.env.BASE_URL || "/";
  if (base === "/") return undefined;
  return base.replace(/\/$/, "");
}
