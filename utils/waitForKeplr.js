/**
 * Keplr injects `window.keplr` from the browser extension. Injection can lag
 * slightly behind React mount, so we poll briefly before treating it as missing.
 */
export async function waitForKeplr(timeoutMs = 4000, intervalMs = 100) {
  if (typeof window === "undefined") return undefined;
  if (window.keplr) return window.keplr;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    if (window.keplr) return window.keplr;
  }
  return undefined;
}

export function isKeplrExtensionAvailable() {
  return typeof window !== "undefined" && !!window.keplr;
}
