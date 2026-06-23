const STORAGE_KEY = "carl-side-bet-amount-atom";

/** Parse user-entered ATOM string → uatom (integer). Invalid / empty → 0. */
export function parseSideBetAmountAtom(atomStr) {
  const n = parseFloat(String(atomStr ?? "").trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n * 1_000_000);
}

export function readStoredSideBetAmount() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeStoredSideBetAmount(atomStr) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, atomStr);
  } catch {
    /* ignore quota / private mode */
  }
}
