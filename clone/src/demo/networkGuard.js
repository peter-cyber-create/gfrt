/**
 * Hard safety boundary when VITE_DEMO_MODE=true.
 * Blocks fetch/XHR to musooka.site and known production hosts.
 */
import { DEMO_MODE, PRODUCTION_HOSTS } from "../data/config.js";

function isBlockedUrl(url) {
  try {
    const host = new URL(url, window.location.origin).hostname;
    return PRODUCTION_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return PRODUCTION_HOSTS.some((h) => String(url).includes(h));
  }
}

export function installDemoNetworkGuard() {
  if (!DEMO_MODE || typeof window === "undefined") return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url || "";
    if (isBlockedUrl(url)) {
      const err = new Error(
        `[demo-mode] Blocked request to production host: ${url}. Local presentation cannot call musooka.site.`
      );
      console.error(err.message);
      return Promise.reject(err);
    }
    return originalFetch(input, init);
  };

  const OriginalXHR = window.XMLHttpRequest;
  function GuardedXHR() {
    const xhr = new OriginalXHR();
    const open = xhr.open;
    xhr.open = function (method, url, ...rest) {
      if (isBlockedUrl(url)) {
        throw new Error(`[demo-mode] Blocked XHR to production host: ${url}`);
      }
      return open.call(this, method, url, ...rest);
    };
    return xhr;
  }
  GuardedXHR.prototype = OriginalXHR.prototype;
  window.XMLHttpRequest = GuardedXHR;

  // Expose for Playwright checks
  window.__MUSOOKA_DEMO_GUARD__ = true;
}
