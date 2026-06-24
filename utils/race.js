import { wasmSpeciesLabel } from "./species";

const ACTION_NAMES = {
  saboteur: "saboteur",
  cheerleader: "cheerleader",
  wildcard: "wildcard",
};

const KEY_TO_WASM_ACTION = {
  saboteur: "Saboteur",
  cheerleader: "Cheerleader",
  wildcard: "Wildcard",
};

/** CosmWasm JSON enum — PascalCase variant name. */
export function toWasmRaceAction(action) {
  const key = String(action ?? "").toLowerCase();
  return KEY_TO_WASM_ACTION[key] ?? action;
}

export function raceActionKey(action) {
  if (!action) return null;
  if (typeof action === "string") {
    const lower = action.toLowerCase();
    if (KEY_TO_WASM_ACTION[lower]) return lower;
    const fromWasm = Object.entries(KEY_TO_WASM_ACTION).find(([, v]) => v === action);
    return fromWasm?.[0] ?? lower;
  }
  return Object.keys(action)[0]?.toLowerCase() ?? null;
}

export function raceActionLabel(action) {
  const key = raceActionKey(action);
  if (!key) return "Unknown";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export async function hashCrowdSalt(salt) {
  const data = new TextEncoder().encode(salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}

export async function hashCommitment(action, salt) {
  const actionKey = ACTION_NAMES[action] || action;
  const payload = `${actionKey}:${salt}`;
  const data = new TextEncoder().encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}

/** Base64 JSON payload for CW721 `send_nft` → contract `ReceiveNft` hook. */
export function buildEnterRaceMsg(commitmentB64) {
  return btoa(JSON.stringify({ commitment: commitmentB64 }));
}

export function getHorizontalPercentage(runnerRank, totalParticipants = 75) {
  if (totalParticipants <= 1) return 50;
  return 100 - ((runnerRank - 1) / (totalParticipants - 1)) * 100;
}

export function getCumulativeDistance(tickDistances, tick) {
  if (!tickDistances?.length) return 0;
  const end = Math.min(tick + 1, tickDistances.length);
  return tickDistances.slice(0, end).reduce((sum, d) => sum + Number(d), 0);
}

export function getDistancePercentage(distance, maxDistance) {
  if (!maxDistance) return 8;
  return 8 + (distance / maxDistance) * 84;
}

export function shortRunnerName(player, species) {
  const tail = player ? player.slice(-4) : "????";
  const label = species ? wasmSpeciesLabel(species) : "Runner";
  return `${label} ·${tail}`;
}

export function getVerticalJitter(playerAddress) {
  if (!playerAddress) return 0;
  return (parseInt(playerAddress.slice(-2), 16) % 18) - 9;
}

export function formatAtom(micro) {
  if (micro == null) return "0";
  const n = Number(micro) / 1_000_000;
  if (n === 0) return "0";
  if (Math.abs(n) < 0.0001) return n.toExponential(2);
  if (Math.abs(n) < 1) return n.toFixed(6).replace(/\.?0+$/, "");
  return n.toFixed(4).replace(/\.?0+$/, "");
}

/** CosmWasm Timestamp → local display string. */
export function formatSettledAt(ts) {
  if (!ts) return "—";
  const sec =
    typeof ts === "object" && ts !== null
      ? Number(ts.seconds ?? ts.Seconds ?? 0)
      : Number(ts);
  if (!sec) return "—";
  return new Date(sec * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 10)}…${addr.slice(-4)}`;
}
