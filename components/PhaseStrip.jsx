"use client";

import { useRaceGlobal, useEnrollingRace, useCurrentPhase, useConfig } from "@/hooks";
import { useNowSec } from "@/hooks/useNowSec";
import {
  nextPhaseDeadline,
  formatCountdownClock,
  isSettlementOpen,
  resolveDisplayPhaseKey,
  entryCloseAt,
  isEntryOpenForRace,
} from "@/utils/phases";
import { ACTION, getMarqueeCopy } from "@/utils/raceTheme";
import { formatAtom } from "@/utils/race";
import { computeFirstPrize, ENTRY_POOL_SPLIT } from "@/utils/settlementPayouts";

export default function PhaseStrip() {
  const { value: race } = useRaceGlobal();
  const { value: enrolling } = useEnrollingRace();
  const { value: phase } = useCurrentPhase();
  const { value: config } = useConfig();
  const nowSec = useNowSec(!!race && !race?.is_settled);

  if (!race) {
    return (
      <section className="w-full mb-4 rounded-xl border-2 border-carl-purple/40 bg-gradient-to-r from-carl-midnight via-carl-plum to-carl-midnight px-4 py-5 sm:px-6">
        <p className="text-lg sm:text-xl font-black uppercase tracking-wide text-carl-text">
          Loading race…
        </p>
      </section>
    );
  }

  const raceId = race.current_race_id ?? 0;
  const displayKey =
    race.total_runners === 0 && config?.test_mode
      ? "idle"
      : resolveDisplayPhaseKey(race, config, phase, nowSec);
  const settlementReady = isSettlementOpen(race, nowSec);

  const { headline, subline } = getMarqueeCopy({
    raceId,
    phaseKey: settlementReady ? "settlement" : displayKey ?? "entry",
    settlementReady,
  });

  const awaitingFirstRunner = race.total_runners === 0 && !race.is_settled;
  const deadline =
    !race.is_settled && !awaitingFirstRunner
      ? nextPhaseDeadline(race, config, nowSec)
      : null;
  const countdownSec =
    deadline && deadline.at > nowSec ? Math.max(0, deadline.at - nowSec) : 0;

  const entryPoolUatom = race.total_entry_pool ?? 0;
  const firstPrizeUatom = computeFirstPrize(entryPoolUatom);
  const showPrize = !race.is_settled;

  const timerLabel = race.is_settled
    ? "STATUS"
    : settlementReady
      ? ACTION.revealResults
      : awaitingFirstRunner
        ? "CLOCK"
        : "NEXT PHASE";

  const timerValue = race.is_settled
    ? "DONE"
    : settlementReady
      ? "OPEN"
      : awaitingFirstRunner
        ? "—"
        : formatCountdownClock(countdownSec);

  return (
    <section
      className="w-full mb-4 overflow-hidden rounded-xl border-2 border-carl-purple/45 bg-gradient-to-r from-carl-midnight via-carl-navy to-carl-midnight shadow-lg shadow-carl-plum/40"
      aria-label="Race marquee"
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="text-lg font-black uppercase leading-tight tracking-wide text-carl-text sm:text-2xl">
            {headline}
          </h1>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-carl-muted sm:text-sm">
            {subline}
          </p>
          {enrolling && !race.is_settled && (
            <p className="mt-2 text-xs font-semibold text-amber-200/90">
              {isEntryOpenForRace(enrolling, nowSec)
                ? `Race #${enrolling.current_race_id} open for entry & bets`
                : `Race #${enrolling.current_race_id} opens when prep starts`}
            </p>
          )}
          {!enrolling && !race.is_settled && entryCloseAt(race) != null && nowSec < entryCloseAt(race) && (
            <p className="mt-2 text-xs text-carl-muted">
              Next race opens when prep closes for race #{raceId}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-stretch justify-center gap-3 sm:justify-end">
          {showPrize && (
            <div className="mx-auto shrink-0 rounded-lg border-2 border-amber-500/45 bg-amber-950/30 px-5 py-3 text-center sm:mx-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200/90">
                1st prize
              </p>
              <p className="mt-0.5 font-mono text-3xl font-black tabular-nums tracking-tight text-amber-100 sm:text-4xl">
                {formatAtom(firstPrizeUatom)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-amber-200/70">
                ATOM · {ENTRY_POOL_SPLIT.firstPrizePct}% of entry pool
              </p>
            </div>
          )}

          <div
            className={`mx-auto shrink-0 rounded-lg border-2 px-5 py-3 text-center sm:mx-0 ${
              settlementReady && !race.is_settled
                ? "border-carl-accent bg-carl-purple/60"
                : "border-carl-purple/50 bg-carl-slate/80"
            }`}
          >
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white">
            {timerLabel}
          </p>
          <p
            className={`mt-0.5 font-mono text-3xl font-black tabular-nums tracking-tight sm:text-4xl ${
              settlementReady && !race.is_settled
                ? "text-carl-accent"
                : awaitingFirstRunner
                  ? "text-white"
                  : "text-carl-text"
            }`}
          >
            {timerValue}
          </p>
          {!race.is_settled && !settlementReady && !awaitingFirstRunner && deadline?.label && (
            <p className="mt-1 max-w-[10rem] truncate text-[10px] uppercase tracking-wide text-gray-500">
              {deadline.label}
            </p>
          )}
          {awaitingFirstRunner && (
            <p className="mt-1 text-[10px] uppercase tracking-wide text-white">
              First runner starts clock
            </p>
          )}
          </div>
        </div>
      </div>
    </section>
  );
}
