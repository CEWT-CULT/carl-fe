import { getCumulativeDistance } from "./race";

export const TICK_COUNT = 5;
export const START_PCT = 5;
export const FINISH_PCT = 92;
export const MAX_LANES = 12;

/** Stable lane order — never reorder by rank. */
export function sortRunnersForLanes(runners) {
  return [...runners].sort((a, b) => String(a.player).localeCompare(String(b.player)));
}

export function cumulativeToDragPct(cumulative, maxCumulative) {
  if (maxCumulative <= 0) return START_PCT;
  const t = cumulative / maxCumulative;
  return START_PCT + t * (FINISH_PCT - START_PCT);
}

/** Monotonic left→right positions for drag-race replay. */
export function positionsForTick(runners, tick, positionMemory) {
  const lanes = sortRunnersForLanes(runners);
  const visible = lanes.slice(0, MAX_LANES);

  const cumulatives = visible.map((r) => ({
    runner: r,
    cumulative: getCumulativeDistance(r.tick_distances, tick),
  }));

  const maxC = Math.max(...cumulatives.map((x) => x.cumulative), 1);

  return cumulatives.map(({ runner, cumulative }) => {
    const key = runner.player;
    const raw = cumulativeToDragPct(cumulative, maxC);
    const prev = positionMemory[key] ?? START_PCT;
    const leftPct = Math.max(prev, raw);
    positionMemory[key] = leftPct;
    return {
      ...runner,
      laneKey: key,
      leftPct,
      cumulative,
    };
  });
}

export function resetPositionMemory(memory) {
  Object.keys(memory).forEach((k) => delete memory[k]);
}

/** Runners parked on the start line (0% progress) before the race goes live. */
export function runnersAtStartLine(roster) {
  return sortRunnersForLanes(roster)
    .slice(0, MAX_LANES)
    .map((r) => ({
      player: r.player,
      species: r.species,
      nft_contract: r.nft_contract,
      nft_id: r.nft_id,
      cumulative: 0,
    }));
}

/**
 * Map on-chain preview cumulative distances → monotonic lane positions.
 * @param {number|null} progressCapPct — 0–85 during live preview; scales absolute
 *   track position. Without it, the leader is normalized to the finish line (replay only).
 */
export function positionsFromCumulative(runners, positionMemory, progressCapPct = null) {
  const visible = sortRunnersForLanes(runners).slice(0, MAX_LANES);
  const maxC = Math.max(...visible.map((r) => Number(r.cumulative ?? 0)), 0);
  const span = FINISH_PCT - START_PCT;
  const cap =
    progressCapPct != null ? Math.min(100, Math.max(0, progressCapPct)) / 100 : null;

  return visible.map((runner) => {
    const key = runner.player;
    const cumulative = Number(runner.cumulative ?? 0);
    let raw = START_PCT;
    if (cumulative > 0 && maxC > 0) {
      if (cap != null) {
        const relative = cumulative / maxC;
        raw = START_PCT + relative * cap * span;
      } else {
        raw = cumulativeToDragPct(cumulative, maxC);
      }
    }
    const prev = positionMemory[key] ?? START_PCT;
    const leftPct = Math.max(prev, raw);
    positionMemory[key] = leftPct;
    return { ...runner, laneKey: key, leftPct, cumulative };
  });
}

/** Pin forfeited runners at the start line after SET closes (or once the race is live/settled). */
export function applyForfeitToLanes(runners, rosterByPlayer, markForfeit) {
  if (!markForfeit) return runners.map((r) => ({ ...r, forfeited: false }));
  return runners.map((runner) => {
    const entry = rosterByPlayer?.[runner.player];
    const forfeited =
      entry != null &&
      (entry.revealed_action == null || entry.revealed_action === undefined);
    if (!forfeited) return { ...runner, forfeited: false };
    return {
      ...runner,
      forfeited: true,
      leftPct: START_PCT,
      cumulative: 0,
    };
  });
}
