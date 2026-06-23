/** C.A.R.L action verbs — READY → GET SET → GET HYPED → GO! → REVEAL RACE RESULTS */

export const ACTION = {
  ready: "READY",
  enterRace: "ENTER RACE",
  readyPending: "Getting READY…",
  set: "GET SET",
  setPending: "Getting SET…",
  cheer: "GET HYPED",
  cheerTitle: "GET HYPED — Add some extra randomness to the race to earn part of the pool",
  cheerPending: "Getting HYPED…",
  go: "GO!",
  finalResults: "Final results",
  revealResults: "REVEAL RACE RESULTS",
  revealResultsPending: "Revealing results…",
};

export const PHASE_THEME = {
  idle: { label: "Gates Open — Awaiting First Runner", short: "Idle" },
  entry: { label: "Get READY — Entry, Bets & GET HYPED", short: "PREP" },
  betting: { label: "Side Bets Open", short: "Bets" },
  crowd_commit: { label: "Blind Entropy Commit", short: "Commit" },
  crowd_reveal: { label: "GET HYPED — Crowd & Runner GET SET", short: "HYPED" },
  reveal: { label: "Almost GO!", short: "Prep" },
  live: { label: "GO! — Stampede Live", short: "GO!" },
  settlement: { label: "REVEAL RACE RESULTS", short: "Results" },
  settled: { label: "Results Locked", short: "Done" },
};

export function phaseLabel(key) {
  return PHASE_THEME[key]?.label ?? key;
}

export function phaseShort(key) {
  return PHASE_THEME[key]?.short ?? key;
}

/** Stadium marquee — ALL CAPS headline + subline per phase. */
export function getMarqueeCopy({ raceId = 0, phaseKey = "entry", settlementReady = false }) {
  const n = raceId || "?";

  if (settlementReady) {
    return {
      headline: `${ACTION.revealResults} — RACE #${n}`,
      subline: "PUBLIC CRANK · LOCK RESULTS · NEXT RACE OPENS AUTO",
    };
  }

  switch (phaseKey) {
    case "idle":
    case "entry":
      return {
        headline: `ENTRY TO RACE #${n} IS OPEN!`,
        subline: "DEPOSIT ATOM AND ENTER A CRITTER",
      };
    case "betting":
      return {
        headline: `BETTING OPEN — RACE #${n}`,
        subline: "PICK A SPECIES · ONE WAGER PER WALLET",
      };
    case "crowd_commit":
      return {
        headline: `CROWD COMMIT — RACE #${n}`,
        subline: "BLIND SALT · SIDE BETTORS ONLY",
      };
    case "crowd_reveal":
      return {
        headline: `${ACTION.cheer} — RACE #${n}`,
        subline: "ENTRIES FOR THIS RACE HAVE ENDED - THE RACE STARTS SOON",
      };
    case "reveal":
      return {
        headline: `${ACTION.set} — RACE #${n}`,
        subline: `UNLOCK YOUR TACTIC BEFORE ${ACTION.go}`,
      };
    case "live":
      return {
        headline: `${ACTION.go} RACE #${n} IS LIVE!`,
        subline: `${ACTION.cheer} THE TRACK · FINALE AT ${ACTION.revealResults}`,
      };
    case "settlement":
      return {
        headline: `${ACTION.revealResults} — RACE #${n}`,
        subline: "PUBLIC CRANK · 4% BOUNTY TO SETTLER",
      };
    case "settled":
      return {
        headline: `RACE #${n} — RESULTS LOCKED`,
        subline: "CLAIM NFTS · PULL VAULT WINNINGS",
      };
    default:
      return {
        headline: `RACE #${n} IN PROGRESS`,
        subline: "DEPOSIT ATOM AND ENTER A CRITTER",
      };
  }
}
