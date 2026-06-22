import { betTypeKey } from "@/utils/sideBets";
import { speciesCapsLabel } from "@/utils/species";

const BET_TYPE_WASM_SPECIES = {
  chicken_victory: "Chicken",
  newt_victory: "Newt",
  penguin_victory: "Penguin",
  fly_victory: "Fly",
  frog_victory: "Frog",
  bull_victory: "Bull",
  fox_victory: "Fox",
  duck_victory: "Duck",
  manta_victory: "Manta",
  shrimp_victory: "Shrimp",
  sloth_victory: "Sloth",
  moth_victory: "Moth",
  snail_victory: "Snail",
  steer_victory: "Steer",
  goat_victory: "Goat",
  kitty_victory: "Kitty",
};

/** Percent-of-pool ratios (denominator 100), matching on-chain settlement. */
export const ENTRY_POOL_SPLIT = {
  firstPrizePct: 70,
  housePct: 20,
  bountyPct: 10,
};

/** Settlement crank bounties (% of entry + side pool). */
export const SETTLEMENT_BOUNTY_PCT = {
  settleCrank: 4,
  crowdCommit: 4,
  racerReveal: 2,
  total: 10,
};

function percentOf(poolUatom, pct) {
  const pool = BigInt(poolUatom ?? 0);
  if (pool === 0n) return 0n;
  return (pool * BigInt(pct)) / 100n;
}

/** Mirrors contract `compute_racer_payouts` — 70% first place, 20% house. */
export function computeFirstPrize(entryPoolUatom) {
  return percentOf(entryPoolUatom, ENTRY_POOL_SPLIT.firstPrizePct);
}

export function computeHouseCut(entryPoolUatom) {
  return percentOf(entryPoolUatom, ENTRY_POOL_SPLIT.housePct);
}

export const SIDE_HOUSE_PCT = 20;

export function entryPoolSplitLabel() {
  const { firstPrizePct, housePct } = ENTRY_POOL_SPLIT;
  return `${firstPrizePct}% 1st · ${housePct}% house`;
}

export function bountySplitLabel() {
  const { total, settleCrank, crowdCommit, racerReveal } = SETTLEMENT_BOUNTY_PCT;
  return `${total}% bounties · ${settleCrank}% settle · ${crowdCommit}% crowd · ${racerReveal}% reveal`;
}

export function sidePoolSplitLabel() {
  return `${SIDE_HOUSE_PCT}% house on losing wagers`;
}

/** 10% of combined pools → settle / crowd / SET bounties. */
export function computeSettlementBounties(entryPoolUatom, betPoolUatom) {
  const total = BigInt(entryPoolUatom ?? 0) + BigInt(betPoolUatom ?? 0);
  if (total === 0n) {
    return { total: 0n, settle: 0n, crowd: 0n, reveal: 0n };
  }
  const settle = (total * BigInt(SETTLEMENT_BOUNTY_PCT.settleCrank)) / 100n;
  const crowd = (total * BigInt(SETTLEMENT_BOUNTY_PCT.crowdCommit)) / 100n;
  const reveal = (total * BigInt(SETTLEMENT_BOUNTY_PCT.racerReveal)) / 100n;
  return { total: settle + crowd + reveal, settle, crowd, reveal };
}

function betTypeWins(bet, settlement) {
  if (!settlement) return false;
  if (settlement.all_bets_off || settlement.rained_out) return true;
  const key = betTypeKey(bet.bet_type);
  if (key === "underdog_wins") return !!settlement.underdog_wins;
  if (key === "racer_victory") {
    if (!settlement.winning_racer || !bet.pick) return false;
    return bet.pick === settlement.winning_racer;
  }
  const species = BET_TYPE_WASM_SPECIES[key];
  return species != null && settlement.winning_species === species;
}

/** Mirrors contract `compute_wager_payout`. */
export function computeWagerPayout(bet, settlement) {
  if (!bet || !settlement) return 0n;
  const amount = BigInt(bet.amount ?? 0);
  if (amount === 0n) return 0n;

  if (settlement.all_bets_off || settlement.rained_out) {
    return amount;
  }

  if (!betTypeWins(bet, settlement)) {
    return 0n;
  }

  const totalWinning = BigInt(settlement.total_winning_wagers ?? 0);
  if (totalWinning === 0n) return 0n;

  const loserPool = BigInt(settlement.loser_contribution ?? 0);
  const bonus = loserPool === 0n ? 0n : (loserPool * amount) / totalWinning;
  let payout = amount + bonus;

  if (
    settlement.remainder_recipient &&
    bet.bettor === settlement.remainder_recipient
  ) {
    payout += BigInt(settlement.remainder ?? 0);
  }

  return payout;
}

export function winningDeskHeadline(settlement, rosterByPlayer) {
  if (!settlement) return "Side bets pending";
  if (settlement.rained_out) return "Race rained out — full refunds";
  if (settlement.all_bets_off) return "One-sided desk — all wagers refunded";
  if (settlement.winning_racer) {
    const runner = rosterByPlayer?.[settlement.winning_racer];
    if (runner?.nft_id != null) {
      return `Racer #${runner.nft_id} wins the desk`;
    }
    return `Racer ${settlement.winning_racer.slice(0, 12)}… wins the desk`;
  }
  if (settlement.underdog_wins) return "UNDERDOG wins the desk";
  if (settlement.winning_species) {
    return `${speciesCapsLabel({ species: settlement.winning_species })} win the desk`;
  }
  return "No winning side";
}
