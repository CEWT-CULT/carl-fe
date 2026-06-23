import { ACTION, PHASE_THEME, phaseLabel, phaseShort } from "./raceTheme";

/** Extract snake_case phase key from CosmWasm JSON enum. */
export function phaseKey(phase) {
  if (!phase) return null;
  if (typeof phase === "string") return phase;
  return Object.keys(phase)[0] ?? null;
}

export { ACTION, phaseLabel, phaseShort };

export const PHASE_LABELS = Object.fromEntries(
  Object.entries(PHASE_THEME).map(([k, v]) => [k, v.label])
);

export const PHASE_SHORT = Object.fromEntries(
  Object.entries(PHASE_THEME).map(([k, v]) => [k, v.short])
);

/** Each phase window in test mode (seconds). */
export const TEST_PHASE_LEN = 300;
export const TEST_CYCLE_SECS = 3 * TEST_PHASE_LEN;
/** Must match contract `PREVIEW_MAX_STEPS`. */
export const PREVIEW_MAX_STEPS = 25;
export const PREVIEW_CRANK_INTERVAL_SECS = 60;
/** Live cranking only shows 0–85%; settlement replay runs the finale. */
export const PREVIEW_PROGRESS_CAP = 85;
/** Test: live track window after reveals (seconds). */
export const TEST_PREVIEW_LIVE_SECS = 5 * 60;
/** Production: 3 races/day in 8h blocks — 3h prep, 3h reveal, 2h live. */
export const PROD_BLOCK_SECS = 8 * 3600;
export const PROD_LIVE_SECS = 3600;
export const PROD_PREP_SECS = 3 * 3600;
export const PROD_REVEAL_GRACE_SECS = 3 * 3600;
/** Per-user reveal delay after commit (seconds). */
export const REVEAL_DELAY_SECS = 5 * 60;
/** @deprecated legacy staggered prod constants */
export const PROD_ENTRY_SECS = PROD_PREP_SECS;
export const PROD_CROWD_COMMIT_SECS = 0;
export const PROD_CROWD_REVEAL_SECS = PROD_REVEAL_GRACE_SECS;
/** Legacy preview crank cap window (prod live hour is `PROD_LIVE_SECS`). */
export const PREVIEW_LIVE_SECS = PREVIEW_MAX_STEPS * PREVIEW_CRANK_INTERVAL_SECS;

/** Max cranks in the live window (test: 5 min → 5; prod: 25). */
export function previewCrankLimit(race, config) {
  if (isTestCrowdSchedule(race) && config?.test_mode) {
    return TEST_PREVIEW_LIVE_SECS / PREVIEW_CRANK_INTERVAL_SECS;
  }
  return PREVIEW_MAX_STEPS;
}

/** Display progress 0–85% during live cranking. */
export function previewProgressPct(race, config, previewStep = race?.preview_step ?? 0) {
  const limit = previewCrankLimit(race, config);
  if (limit <= 0) return 0;
  const step = Math.min(Number(previewStep) || 0, limit);
  return (step / limit) * PREVIEW_PROGRESS_CAP;
}

export function tsToSeconds(ts) {
  if (ts == null) return null;
  if (typeof ts === "object") {
    const sec = ts.seconds ?? ts.second;
    if (sec != null) {
      const n = Number(sec);
      return Number.isFinite(n) ? n : null;
    }
  }
  if (typeof ts === "string" && /^\d+$/.test(ts) && ts.length > 12) {
    try {
      return Number(BigInt(ts) / 1_000_000_000n);
    } catch {
      return null;
    }
  }
  const n = Number(ts);
  if (!Number.isFinite(n)) return null;
  return n > 1e12 ? Math.floor(n / 1e9) : n;
}

/** Combined prep: entry + crowd commit share the same window (production). */
export function isCombinedPrepSchedule(race) {
  const p2 = tsToSeconds(race?.phase_2_close);
  const cc = tsToSeconds(race?.crowd_commit_close);
  const cr = tsToSeconds(race?.crowd_reveal_close);
  if (p2 == null || cc == null || cr == null) return false;
  return p2 === cc && cr > cc;
}

/** Staggered entry → crowd commit → reveal → live (test mode). */
export function isStaggeredCrowdSchedule(race) {
  const p2 = tsToSeconds(race?.phase_2_close);
  const cc = tsToSeconds(race?.crowd_commit_close);
  const cr = tsToSeconds(race?.crowd_reveal_close);
  if (p2 == null || cc == null || cr == null) return false;
  if (p2 > 1e12) return false;
  return p2 < cc && cc <= cr;
}

/** @deprecated alias — same shape as production tri-daily blocks */
export function isTestCrowdSchedule(race) {
  return isStaggeredCrowdSchedule(race);
}

export function isTestRace(race, config) {
  return !!config?.test_mode && (race?.total_runners ?? 0) > 0 && isTestCrowdSchedule(race);
}

export function crowdPhasesEnabled(race) {
  const cc = tsToSeconds(race?.crowd_commit_close);
  const cr = tsToSeconds(race?.crowd_reveal_close);
  return cc != null && cr != null && cr > cc;
}

/** When side bets lock — mirrors contract `is_race_preview_open` threshold. */
export function bettingCloseAt(race) {
  const cr = tsToSeconds(race?.crowd_reveal_close);
  const p1 = tsToSeconds(race?.phase_1_close);
  const p3 = tsToSeconds(race?.phase_3_close);
  if (isStaggeredCrowdSchedule(race)) return cr ?? p1 ?? p3;
  return cr ?? p3 ?? p1;
}

/** When NFT entry closes — mirrors contract `is_entry_open` (until `phase_2_close`). */
export function entryCloseAt(race) {
  return tsToSeconds(race?.phase_2_close) ?? tsToSeconds(race?.phase_1_close);
}

/** Side bets until the race goes live — mirrors contract `is_betting_open`. */
export function isBettingOpen(race, config, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return false;
  if (config?.test_mode && (race.total_runners ?? 0) === 0) return false;
  const closeAt = bettingCloseAt(race);
  if (closeAt != null && nowSec >= closeAt) return false;
  return true;
}

/** NFT entry only during phase 1. */
export function isEntryOpen(phase) {
  return phaseKey(phase) === "entry";
}

/** Mirrors contract `is_entry_open` for a specific race record. */
export function isEntryOpenForRace(race, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return false;
  const close = entryCloseAt(race);
  return close != null && nowSec < close;
}

/** Race accepting NFT entries — running prep first, then pipeline enrolling. */
export function entryTargetRace(running, enrolling, nowSec = Date.now() / 1000) {
  if (running && !running.is_settled && isEntryOpenForRace(running, nowSec)) return running;
  if (enrolling && isEntryOpenForRace(enrolling, nowSec)) return enrolling;
  return null;
}

/** Race accepting side bets — live race first, then pipeline enrolling. */
export function bettingTargetRace(running, enrolling, config, nowSec = Date.now() / 1000) {
  if (running && !running.is_settled && isBettingOpen(running, config, nowSec)) {
    return running;
  }
  if (enrolling && isBettingOpen(enrolling, config, nowSec)) {
    return enrolling;
  }
  return null;
}

/** CosmWasm `enrolling_race` query — null when no pipeline race is queued. */
export function parseEnrollingRace(data) {
  if (!data || typeof data !== "object") return null;
  const id = data.current_race_id;
  if (id == null || Number(id) <= 0) return null;
  return data;
}

export function hasEnrollingRace(enrolling) {
  return parseEnrollingRace(enrolling) != null;
}

/** True when a permissionless `open_next_race` crank should run. */
export function shouldOpenNextRace(running, enrolling, nowSec = Date.now() / 1000) {
  if (!running || running.is_settled || hasEnrollingRace(enrolling)) return false;
  const prepClose = entryCloseAt(running);
  return prepClose != null && nowSec >= prepClose;
}

/** Mirrors contract `should_auto_rain_out` — permissionless early close + next race. */
export function shouldOfferRainOut(race, roster, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return false;
  const runners = race.total_runners ?? 0;
  const entryClose = entryCloseAt(race);
  if (runners === 0 && entryClose != null && nowSec >= entryClose) return true;
  const revealClose = tsToSeconds(race.crowd_reveal_close);
  if (runners > 0 && revealClose != null && nowSec >= revealClose) {
    return !(roster ?? []).some((r) => r.revealed_action);
  }
  return false;
}

export function rainOutReason(race, roster, nowSec = Date.now() / 1000) {
  if (!shouldOfferRainOut(race, roster, nowSec)) return null;
  if ((race?.total_runners ?? 0) === 0) {
    return "No runners entered — rain out refunds side bets and opens the next race.";
  }
  return "No runner hit GET SET — rain out refunds entry fees and side bets, then opens the next race.";
}

export function isCrowdCommitOpen(phase, race, config, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled || !crowdPhasesEnabled(race)) return false;
  if (isCombinedPrepSchedule(race)) {
    const p2 = tsToSeconds(race.phase_2_close);
    return p2 != null && nowSec < p2;
  }
  if (isStaggeredCrowdSchedule(race)) {
    const p2 = tsToSeconds(race.phase_2_close);
    const cc = tsToSeconds(race.crowd_commit_close);
    return p2 != null && cc != null && nowSec >= p2 && nowSec < cc;
  }
  if (config?.test_mode) return phaseKey(phase) === "crowd_commit";
  const p1 = tsToSeconds(race.phase_1_close);
  const cc = tsToSeconds(race.crowd_commit_close);
  return p1 != null && cc != null && nowSec >= p1 && nowSec < cc;
}

/** Seconds until this actor may reveal (0 = ready). */
export function secondsUntilPersonalReveal(committedAtSec, nowSec = Date.now() / 1000) {
  if (committedAtSec == null) return 0;
  return Math.max(0, committedAtSec + REVEAL_DELAY_SECS - nowSec);
}

export function personalRevealReady(committedAtSec, nowSec = Date.now() / 1000) {
  return secondsUntilPersonalReveal(committedAtSec, nowSec) === 0;
}

export function isCrowdRevealOpen(phase, race, config, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled || !crowdPhasesEnabled(race)) return false;
  if (isStaggeredCrowdSchedule(race)) {
    const cc = tsToSeconds(race.crowd_commit_close);
    const cr = tsToSeconds(race.crowd_reveal_close);
    return cc != null && cr != null && nowSec >= cc && nowSec < cr;
  }
  if (config?.test_mode) return phaseKey(phase) === "crowd_reveal";
  const p3o = tsToSeconds(race.phase_3_open);
  const cr = tsToSeconds(race.crowd_reveal_close);
  return p3o != null && cr != null && nowSec >= p3o && nowSec < cr;
}

export function isRevealOpen(phase, race, config, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return false;
  if (isStaggeredCrowdSchedule(race)) {
    const cc = tsToSeconds(race.crowd_commit_close);
    const cr = tsToSeconds(race.crowd_reveal_close);
    return (
      race.total_runners > 0 &&
      cc != null &&
      cr != null &&
      nowSec >= cc &&
      nowSec < cr
    );
  }
  if (config?.test_mode && crowdPhasesEnabled(race)) {
    return phaseKey(phase) === "crowd_reveal" && race.total_runners > 0;
  }
  if (config?.test_mode) {
    return race.total_runners > 0 && nowSec < (tsToSeconds(race.phase_2_close) ?? 0);
  }
  return phaseKey(phase) === "reveal" || phaseKey(phase) === "crowd_reveal";
}

/** Timestamp when runner SET opens (null if window is phase-driven only). */
export function revealWindowStart(race, config) {
  if (!race || race.is_settled) return null;
  if (isStaggeredCrowdSchedule(race)) {
    return tsToSeconds(race.crowd_commit_close);
  }
  if (config?.test_mode && crowdPhasesEnabled(race)) {
    return tsToSeconds(race.crowd_commit_close);
  }
  if (config?.test_mode) return null;
  return tsToSeconds(race.phase_3_open);
}

/** Timestamp when runner SET closes. */
export function revealWindowEnd(race) {
  if (!race) return null;
  if (isStaggeredCrowdSchedule(race) || isCombinedPrepSchedule(race)) {
    return tsToSeconds(race.crowd_reveal_close);
  }
  return tsToSeconds(race.phase_3_close);
}

/** Seconds until SET is available (0 = open now). */
export function secondsUntilRevealOpen(race, config, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled || (race.total_runners ?? 0) === 0) return null;
  const start = revealWindowStart(race, config);
  if (start == null) return null;
  return Math.max(0, start - nowSec);
}

/** Seconds until SET window closes (0 = closed). */
export function secondsUntilRevealClose(race, nowSec = Date.now() / 1000) {
  if (!race) return null;
  const end = revealWindowEnd(race);
  if (end == null) return null;
  return Math.max(0, end - nowSec);
}

/** True once the SET window has ended — missing reveal counts as forfeit from here on. */
export function isRevealWindowClosed(race, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return false;
  const end = revealWindowEnd(race);
  if (end == null) return false;
  return nowSec >= end;
}

/** When this runner may call GET SET (max of global reveal open and personal 5m delay). */
export function runnerSetOpensAtSec(race, config, entry) {
  const globalOpen = revealWindowStart(race, config);
  const committedAt = tsToSeconds(entry?.committed_at);
  const personalOpen =
    committedAt != null ? committedAt + REVEAL_DELAY_SECS : null;
  if (globalOpen == null && personalOpen == null) return null;
  if (globalOpen == null) return personalOpen;
  if (personalOpen == null) return globalOpen;
  return Math.max(globalOpen, personalOpen);
}

/** Human-readable UTC timestamp for “come back at …”. */
export function formatUtcDateTime(unixSec) {
  if (unixSec == null || !Number.isFinite(unixSec)) return "—";
  return new Date(unixSec * 1000).toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  });
}

/** Long countdown for multi-hour waits — e.g. "3h 28m 05s". */
export function formatCountdownLong(seconds) {
  if (seconds == null || seconds < 0) return "--:--:--";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`;
  }
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

/**
 * Runner-facing GET SET schedule for the connected wallet's race entry.
 * @returns {{ status: 'hidden'|'not_entered'|'done'|'waiting'|'open'|'missed'|'unknown', opensAt?, closesAt?, secondsUntilOpen?, secondsUntilClose? }}
 */
export function getRunnerSetSchedule(race, config, entry, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return { status: "hidden" };
  if (!entry) return { status: "not_entered" };
  if (entry.revealed_action) return { status: "done" };

  const opensAt = runnerSetOpensAtSec(race, config, entry);
  const closesAt = revealWindowEnd(race);
  if (opensAt == null || closesAt == null) return { status: "unknown" };

  if (nowSec >= closesAt) {
    return { status: "missed", opensAt, closesAt };
  }
  if (nowSec >= opensAt) {
    return {
      status: "open",
      opensAt,
      closesAt,
      secondsUntilClose: Math.max(0, closesAt - nowSec),
    };
  }
  return {
    status: "waiting",
    opensAt,
    closesAt,
    secondsUntilOpen: Math.max(0, opensAt - nowSec),
  };
}

export function nextPhaseDeadline(race, config, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return null;
  const p1 = tsToSeconds(race.phase_1_close);
  const p2 = tsToSeconds(race.phase_2_close);
  const cc = tsToSeconds(race.crowd_commit_close);
  const cr = tsToSeconds(race.crowd_reveal_close);
  const p3 = tsToSeconds(race.phase_3_close);
  if (p1 == null || p2 == null || p3 == null) return null;

  if (race.total_runners === 0) {
    return { label: "Clock starts on first entry", at: nowSec + 999999, nextPhase: "entry" };
  }

  const closeAt = bettingCloseAt(race);
  const entryClose = entryCloseAt(race);
  const testRace = isTestRace(race, config) || isStaggeredCrowdSchedule(race);

  if (isRaceLive(race, nowSec)) {
    return { label: `${ACTION.revealResults} opens`, at: p3, nextPhase: "settlement" };
  }

  if (testRace && cc != null && cr != null) {
    if (nowSec < entryClose) return { label: "Entry closes", at: entryClose, nextPhase: "crowd_commit" };
    if (nowSec < cc) return { label: "Crowd commit ends", at: cc, nextPhase: "crowd_reveal" };
    if (nowSec < cr) return { label: `${ACTION.cheer} ends · ${ACTION.go} next`, at: cr, nextPhase: "live" };
    if (nowSec < p3) return { label: `${ACTION.revealResults} opens`, at: p3, nextPhase: "settlement" };
    return { label: `${ACTION.revealResults} open`, at: p3, nextPhase: "settled" };
  }

  if (crowdPhasesEnabled(race) && cc != null && cr != null) {
    const prepLabel = isCombinedPrepSchedule(race) ? "Prep ends" : "Entry closes";
    if (nowSec < entryClose) return { label: prepLabel, at: entryClose, nextPhase: "betting" };
    if (nowSec < cc) return { label: "Crowd commit ends", at: cc, nextPhase: "crowd_reveal" };
    if (nowSec < closeAt) return { label: "Betting closes", at: closeAt, nextPhase: "settlement" };
    return { label: `${ACTION.revealResults} open`, at: p3, nextPhase: "settled" };
  }

  if (p1 === p2 && p2 === p3) {
    if (nowSec < entryClose) return { label: "Entry closes", at: entryClose, nextPhase: "settlement" };
    return { label: `${ACTION.revealResults} open`, at: p3, nextPhase: "settled" };
  }

  if (nowSec < entryClose) return { label: "Entry closes", at: entryClose, nextPhase: "betting" };
  if (nowSec < closeAt) return { label: "Betting closes", at: closeAt, nextPhase: "reveal" };
  if (nowSec < p3) return { label: `${ACTION.set} ends`, at: p3, nextPhase: "settlement" };
  return { label: `${ACTION.revealResults} open`, at: p3, nextPhase: "settled" };
}

export function formatCountdown(seconds) {
  if (seconds <= 0) return "now";
  if (seconds >= 3600) return formatCountdownLong(seconds);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** Clock-style countdown — uses h/m/s for waits over an hour (not raw minutes like 203:57). */
export function formatCountdownClock(seconds) {
  if (seconds == null || seconds < 0) return "--:--";
  if (seconds >= 3600) return formatCountdownLong(seconds);
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function isSettlementOpen(race, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return false;
  const p3 = tsToSeconds(race.phase_3_close);
  return p3 != null && nowSec >= p3;
}

/** Race is on the track — after reveals close, before settlement. */
export function isRaceLive(race, nowSec = Date.now() / 1000) {
  if (!race || race.is_settled) return false;
  const liveStart = tsToSeconds(race.crowd_reveal_close);
  const settleAt = tsToSeconds(race.phase_3_close);
  if (liveStart == null || settleAt == null) return false;
  return nowSec >= liveStart && nowSec < settleAt;
}

/** Seconds until the next public preview crank is allowed (0 = ready). */
export function secondsUntilPreviewCrank(race, nowSec = Date.now() / 1000, config) {
  if (!race || race.is_settled || !isRaceLive(race, nowSec)) return null;
  const step = race.preview_step ?? 0;
  const limit = previewCrankLimit(race, config);
  if (step >= limit) return null;
  if (step === 0) return 0;
  const last = tsToSeconds(race.last_preview_crank);
  if (last == null) return 0;
  return Math.max(0, PREVIEW_CRANK_INTERVAL_SECS - (nowSec - last));
}

export function canCrankRacePreview(race, nowSec = Date.now() / 1000, config) {
  if (!isRaceLive(race, nowSec)) return false;
  const limit = previewCrankLimit(race, config);
  if ((race.preview_step ?? 0) >= limit) return false;
  return secondsUntilPreviewCrank(race, nowSec, config) === 0;
}

/** UI phase key — timestamp-aware, matches timeline stepper. */
export function resolveDisplayPhaseKey(race, config, phase, nowSec = Date.now() / 1000) {
  if (!race) return "entry";
  if (race.is_settled) return "settled";
  if (config?.test_mode && race.total_runners === 0) return "idle";
  if (isSettlementOpen(race, nowSec)) return "settlement";
  if (isRaceLive(race, nowSec)) return "live";

  if (isStaggeredCrowdSchedule(race)) {
    const p2 = tsToSeconds(race.phase_2_close);
    const cc = tsToSeconds(race.crowd_commit_close);
    const cr = tsToSeconds(race.crowd_reveal_close);
    if (p2 != null && nowSec < p2) return "entry";
    if (cc != null && nowSec < cc) return "crowd_commit";
    if (cr != null && nowSec < cr) return "crowd_reveal";
    const p3 = tsToSeconds(race.phase_3_close);
    if (p3 != null && nowSec < p3) return "live";
    return "settlement";
  }

  if (isCombinedPrepSchedule(race)) {
    const p2 = tsToSeconds(race.phase_2_close);
    const cr = tsToSeconds(race.crowd_reveal_close);
    if (p2 != null && nowSec < p2) return "entry";
    if (cr != null && nowSec < cr) return "crowd_reveal";
    const p3 = tsToSeconds(race.phase_3_close);
    if (p3 != null && nowSec < p3) return "live";
    return "settlement";
  }

  return phaseKey(phase) ?? "entry";
}

export function getPhaseFlavor(key, ctx = {}) {
  const { runners = 0, crowdCommits = 0, crowdReveals = 0, betPool = 0 } = ctx;
  const pool = (Number(betPool) / 1e6).toFixed(4);

  const flavors = {
    idle: {
      headline: "The track is quiet…",
      subline: "First runner through the gate starts the 20-minute race clock.",
    },
    entry: {
      headline: runners > 0 ? `${runners} runners on the grid` : `${ACTION.ready} — gates wide open`,
      subline: `Entry, side bets & ${ACTION.cheer} commit open · ${pool} ATOM on the desk`,
    },
    betting: {
      headline: `${ACTION.ready} closed — betting desk still live`,
      subline: `Side bets open through ${ACTION.cheer} — desk locks when the race goes ${ACTION.go}`,
    },
    crowd_commit: {
      headline: "The crowd locks blind entropy",
      subline: `${crowdCommits} salt${crowdCommits === 1 ? "" : "s"} committed · outcomes still hidden`,
    },
    crowd_reveal: {
      headline: `${ACTION.cheer} — masks off, tactics on chain`,
      subline: `${crowdReveals}/${crowdCommits || "?"} crowd salts · runners hit ${ACTION.set}`,
    },
    reveal: {
      headline: `Almost ${ACTION.go}!`,
      subline: `${ACTION.revealResults} opens after the live hour.`,
    },
    live: {
      headline: `${ACTION.go} The stampede is live`,
      subline: `${ACTION.cheer} once per minute — progress tops out at 85% until results`,
    },
    settlement: {
      headline: ACTION.revealResults,
      subline: "Public crank · 2% pool · crowd & SET bonuses paid from total pool",
    },
    settled: {
      headline: "Results locked",
      subline: "Final drag replay · claim NFTs · pull vault winnings.",
    },
  };

  return flavors[key] ?? { headline: PHASE_LABELS[key] ?? "Race in progress", subline: "" };
}

export const STAMPEDE_TICK_FLAVOR = [
  { headline: "Green light! Runners launch from the line.", subline: "Engines hot — lane positions locked." },
  { headline: "Saboteurs tap the leaders' bumpers.", subline: "Front pack slows — trailers keep rolling forward." },
  { headline: "Rubberband surge from the back straight.", subline: "No reverse — everyone still inches right." },
  { headline: "Wildcard nitro in the mid pack.", subline: "Variance shakes order without lane swaps." },
  { headline: "Photo finish — dust at the wall.", subline: "Final tick sets the purse." },
];

export function getLiveTrackFlavor(key, ctx = {}) {
  return getPhaseFlavor(key, ctx);
}
