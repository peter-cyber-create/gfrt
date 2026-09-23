import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

/**
 * GitHub Pages project site:
 *   https://peter-cyber-create.github.io/gfrt/
 * Local / Docker / same-origin hosts use base "/".
 *
 * Override with VITE_BASE_PATH (must end with "/"), e.g. VITE_BASE_PATH=/gfrt/
 */
function resolveBase(mode, env) {
  const fromEnv = (env.VITE_BASE_PATH || process.env.VITE_BASE_PATH || "").trim();
  if (fromEnv) {
    const withSlashes = fromEnv.startsWith("/") ? fromEnv : `/${fromEnv}`;
    return withSlashes.endsWith("/") ? withSlashes : `${withSlashes}/`;
  }
  if (env.GITHUB_PAGES === "true" || process.env.GITHUB_PAGES === "true") {
    return "/gfrt/";
  }
  return "/";
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = resolveBase(mode, env);

  return {
    base,
    plugins: [react()],
  };
});
