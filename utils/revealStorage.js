const STORAGE_KEY = "carl_reveal_payload";

function storageKey(raceId, address) {
  return `${raceId}:${address}`;
}

export function saveRevealPayload({ raceId, address, salt, action }) {
  if (typeof window === "undefined" || !raceId || !address) return;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[storageKey(raceId, address)] = { salt, action, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadRevealPayload(raceId, address) {
  if (typeof window === "undefined" || !raceId || !address) return null;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[storageKey(raceId, address)] ?? null;
  } catch {
    return null;
  }
}
