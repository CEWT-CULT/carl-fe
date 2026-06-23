import { SPECIES, speciesCapsLabel, speciesKey } from "@/utils/species";

/** CosmWasm Addr JSON may be a plain string or `{ address }`. */
export function normalizePick(pick) {
  if (!pick) return null;
  if (typeof pick === "string") return pick;
  return pick.address ?? pick.addr ?? null;
}

/** Extract snake_case bet type key from CosmWasm JSON enum. */
export function betTypeKey(betType) {
  if (!betType) return null;
  if (typeof betType === "string") {
    if (betType.includes("_")) return betType;
    return WASM_TO_KEY[betType] ?? betType;
  }
  return Object.keys(betType)[0] ?? null;
}

const KEY_TO_WASM = {
  chicken_victory: "ChickenVictory",
  newt_victory: "NewtVictory",
  penguin_victory: "PenguinVictory",
  fly_victory: "FlyVictory",
  frog_victory: "FrogVictory",
  bull_victory: "BullVictory",
  fox_victory: "FoxVictory",
  duck_victory: "DuckVictory",
  manta_victory: "MantaVictory",
  shrimp_victory: "ShrimpVictory",
  sloth_victory: "SlothVictory",
  moth_victory: "MothVictory",
  snail_victory: "SnailVictory",
  steer_victory: "SteerVictory",
  goat_victory: "GoatVictory",
  kitty_victory: "KittyVictory",
  underdog_wins: "UnderdogWins",
  racer_victory: "RacerVictory",
};

const WASM_TO_KEY = Object.fromEntries(
  Object.entries(KEY_TO_WASM).map(([k, v]) => [v, k])
);

/** Encode bet type for CosmWasm execute (PascalCase string enum). */
export function toWasmBetType(betType) {
  const key = betTypeKey(betType);
  return KEY_TO_WASM[key] ?? betType;
}
const BET_TYPE_LABELS = Object.fromEntries(
  SPECIES.map((s) => [s.betType, speciesCapsLabel(s)])
);
BET_TYPE_LABELS.underdog_wins = "UNDERDOG";
BET_TYPE_LABELS.racer_victory = "RACER";

export function racerBetLabel(pick, rosterByPlayer, collectionNames = {}) {
  const addr = normalizePick(pick);
  if (!addr) return "RACER";
  const runner = rosterByPlayer?.[addr];
  if (runner) {
    const id = runner.nft_id != null ? `#${runner.nft_id}` : "";
    const contract = runner.nft_contract;
    const collection =
      (contract && collectionNames[contract]) || speciesCapsLabel(speciesKey(runner));
    return `${id} ${collection}`.trim();
  }
  return `${addr.slice(0, 10)}…`;
}

export function betTypeLabel(betType, { pick, rosterByPlayer, collectionNames } = {}) {
  const key = betTypeKey(betType);
  if (key === "racer_victory") {
    return racerBetLabel(pick, rosterByPlayer, collectionNames);
  }
  return BET_TYPE_LABELS[key] ?? key ?? "Unknown";
}

/** Mirrors contract `is_one_sided_market` for client-side desk snapshots. */
export function isOneSidedDesk(desk) {
  if (!desk?.bets?.length) return false;
  return desk.one_sided === true;
}

export function dominantBetType(desk) {
  if (!desk?.bets?.length) return null;
  const totals = new Map();
  for (const bet of desk.bets) {
    const key = betTypeKey(bet.bet_type);
    if (!key) continue;
    totals.set(key, (totals.get(key) ?? 0) + Number(bet.amount));
  }
  let top = null;
  let topAmt = 0;
  for (const [key, amt] of totals) {
    if (amt > topAmt) {
      top = key;
      topAmt = amt;
    }
  }
  return top;
}

/** Count wagers by desk category and per-runner picks. */
export function summarizeSideBetDesk(desk) {
  const byPick = new Map();
  let totalWagers = 0;
  let racerBets = 0;
  let tribeBets = 0;
  let underdogBets = 0;

  for (const bet of desk?.bets ?? []) {
    totalWagers += 1;
    const key = betTypeKey(bet.bet_type);
    const amt = Number(bet.amount ?? 0);

    if (key === "racer_victory") {
      racerBets += 1;
      const pick = normalizePick(bet.pick);
      if (pick) {
        const cur = byPick.get(pick) ?? { count: 0, amount: 0 };
        byPick.set(pick, { count: cur.count + 1, amount: cur.amount + amt });
      }
    } else if (key === "underdog_wins") {
      underdogBets += 1;
    } else if (key) {
      tribeBets += 1;
    }
  }

  return { totalWagers, racerBets, tribeBets, underdogBets, byPick };
}
