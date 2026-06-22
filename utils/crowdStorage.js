const STORAGE_KEY = "carl_crowd_payload";

function storageKey(raceId, address) {
  return `${raceId}:${address}`;
}

export function saveCrowdPayload({ raceId, address, salt }) {
  if (typeof window === "undefined" || !raceId || !address) return;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    all[storageKey(raceId, address)] = { salt, savedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function loadCrowdPayload(raceId, address) {
  if (typeof window === "undefined" || !raceId || !address) return null;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return all[storageKey(raceId, address)] ?? null;
  } catch {
    return null;
  }
}
