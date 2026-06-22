import {
  PHASE_LABELS,
  PHASE_SHORT,
  phaseKey,
  crowdPhasesEnabled,
  isCombinedPrepSchedule,
  isStaggeredCrowdSchedule,
  isTestRace,
  resolveDisplayPhaseKey,
  entryCloseAt,
  bettingCloseAt,
  tsToSeconds,
  formatCountdown,
  isSettlementOpen,
  isRaceLive,
  TEST_PHASE_LEN,
  TEST_CYCLE_SECS,
  TEST_PREVIEW_LIVE_SECS,
  PROD_BLOCK_SECS,
  PROD_LIVE_SECS,
  PROD_PREP_SECS,
} from "./phases";

const STEP_ORDER_COMBINED_PREP = ["entry", "crowd_reveal", "live", "settlement"];
const STEP_ORDER_CROWD = ["entry", "betting", "crowd_commit", "crowd_reveal", "live", "settlement"];
const STEP_ORDER_PROD = ["entry", "betting", "reveal", "live", "settlement"];
const STEP_ORDER_LEGACY = ["entry", "settlement"];

function stepMeta(id) {
  return {
    id,
    label: PHASE_LABELS[id] ?? id,
    shortLabel: PHASE_SHORT[id] ?? id,
  };
}

function pickStepOrder(race, config) {
  if (race?.is_settled) return ["settled"];
  if (config?.test_mode && race?.total_runners === 0) {
    return ["idle", ...STEP_ORDER_CROWD];
  }
  if (isTestRace(race, config) || isStaggeredCrowdSchedule(race)) return STEP_ORDER_CROWD;
  if (isCombinedPrepSchedule(race)) return STEP_ORDER_COMBINED_PREP;
  if (crowdPhasesEnabled(race)) return STEP_ORDER_CROWD;
  const p1 = tsToSeconds(race?.phase_1_close);
  const p2 = tsToSeconds(race?.phase_2_close);
  const p3 = tsToSeconds(race?.phase_3_close);
  if (p1 != null && p2 != null && p3 != null && p1 === p2 && p2 === p3) return STEP_ORDER_LEGACY;
  return STEP_ORDER_PROD;
}

function stepEndsAt(id, race) {
  const cc = tsToSeconds(race.crowd_commit_close);
  const cr = tsToSeconds(race.crowd_reveal_close);
  const p3 = tsToSeconds(race.phase_3_close);
  const entryClose = entryCloseAt(race);
  const bettingClose = bettingCloseAt(race);
  switch (id) {
    case "idle":
      return null;
    case "entry":
      return entryClose;
    case "betting":
      return bettingClose;
    case "crowd_commit":
      return cc;
    case "crowd_reveal":
      return cr ?? bettingClose;
    case "live":
      return p3;
    case "reveal":
      return cr ?? p3;
    case "settlement":
      return p3;
    default:
      return null;
  }
}

/** Build timeline rows for the phase stepper UI. */
export function buildPhaseTimeline(race, config, phase, nowSec = Date.now() / 1000) {
  if (!race) return [];

  const order = pickStepOrder(race, config);
  const chainKey = resolveDisplayPhaseKey(race, config, phase, nowSec);
  const chainIdx = order.indexOf(chainKey);

  return order.map((id, idx) => {
    const endsAt = stepEndsAt(id, race);
    let remaining = null;

    if (id === "settlement" && !race.is_settled) {
      const p3 = tsToSeconds(race.phase_3_close);
      if (p3 != null && nowSec < p3) remaining = Math.max(0, p3 - nowSec);
    } else if (endsAt != null && nowSec < endsAt && (idx >= chainIdx || chainIdx < 0)) {
      remaining = Math.max(0, endsAt - nowSec);
    } else if (endsAt != null && idx === chainIdx && nowSec < endsAt) {
      remaining = Math.max(0, endsAt - nowSec);
    }

    let status = "future";
    if (race.is_settled) {
      status = id === "settled" ? "current" : "past";
    } else if (chainIdx >= 0) {
      if (idx < chainIdx) status = "past";
      else if (idx === chainIdx) status = "current";
      else if (idx === chainIdx + 1) status = "next";
    }

    const entryClose = entryCloseAt(race);
    const bettingClose = bettingCloseAt(race);
    const bettingStillOpen =
      bettingClose != null &&
      entryClose != null &&
      nowSec >= entryClose &&
      nowSec < bettingClose;
    if (id === "betting" && bettingStillOpen && status === "past") {
      status = "current";
    }

    return {
      ...stepMeta(id),
      status,
      endsAt,
      remaining,
      remainingLabel: remaining != null ? formatCountdown(remaining) : null,
    };
  });
}

export function resolveNextStep(timeline) {
  const currentIdx = timeline.findIndex((s) => s.status === "current");
  if (currentIdx >= 0 && currentIdx < timeline.length - 1) {
    return timeline[currentIdx + 1];
  }
  return timeline.find((s) => s.status === "next") ?? null;
}

export function raceElapsedSec(race, nowSec) {
  if (!race || race.total_runners === 0) return null;
  const p2 = tsToSeconds(race.phase_2_close);
  if (p2 == null || p2 > 1e12) return null;
  if (isStaggeredCrowdSchedule(race)) {
    const maxElapsed = TEST_CYCLE_SECS + TEST_PREVIEW_LIVE_SECS;
    const blockStart = tsToSeconds(race.phase_3_close) - PROD_BLOCK_SECS;
    if (blockStart != null && blockStart > 1e9 && PROD_BLOCK_SECS > TEST_CYCLE_SECS) {
      return Math.max(0, Math.min(PROD_BLOCK_SECS, nowSec - blockStart));
    }
    return Math.max(0, Math.min(maxElapsed, nowSec - (p2 - TEST_PHASE_LEN)));
  }
  if (crowdPhasesEnabled(race)) {
    return Math.max(0, Math.min(TEST_CYCLE_SECS, nowSec - (p2 - TEST_PHASE_LEN)));
  }
  const p1 = tsToSeconds(race.phase_1_close);
  if (p1 != null && p1 === p2) {
    return Math.max(0, nowSec - (p2 - TEST_CYCLE_SECS));
  }
  return Math.max(0, nowSec - (p2 - TEST_PHASE_LEN));
}

export function formatElapsed(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
