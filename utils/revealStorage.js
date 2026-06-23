const STORAGE_KEY = "carl_reveal_payload";
const SESSION_KEY = "carl_reveal_payload_session";

function storageKey(raceId, address) {
  return `${raceId}:${address}`;
}

function readBucket(storage) {
  try {
    return JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeBucket(storage, all) {
  storage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function saveRevealPayload({ raceId, address, salt, action }) {
  if (typeof window === "undefined" || !raceId || !address) return;
  const payload = { salt, action, savedAt: Date.now() };
  const key = storageKey(raceId, address);

  try {
    const all = readBucket(localStorage);
    all[key] = payload;
    writeBucket(localStorage, all);
  } catch {
    /* ignore quota / private mode */
  }

  try {
    const all = readBucket(sessionStorage);
    all[key] = payload;
    writeBucket(sessionStorage, all);
  } catch {
    /* ignore */
  }
}

export function loadRevealPayload(raceId, address) {
  if (typeof window === "undefined" || !raceId || !address) return null;
  const key = storageKey(raceId, address);

  try {
    const fromLocal = readBucket(localStorage)[key];
    if (fromLocal?.salt) return fromLocal;
  } catch {
    /* ignore */
  }

  try {
    return readBucket(sessionStorage)[key] ?? null;
  } catch {
    return null;
  }
}

export function formatRevealCredentials({ raceId, action, salt }) {
  const tactic = String(action ?? "saboteur");
  return `Race #${raceId} GET SET credentials\nTactic: ${tactic}\nSalt: ${salt}`;
}
