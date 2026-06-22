"use client";

import { useMemo } from "react";
import { useRaceGlobal, useCurrentPhase, useConfig, useCrowdEntropyDesk } from "@/hooks";
import { useNowSec } from "@/hooks/useNowSec";
import {
  phaseKey,
  getPhaseFlavor,
  nextPhaseDeadline,
  formatCountdown,
  formatCountdownClock,
  isSettlementOpen,
  resolveDisplayPhaseKey,
} from "@/utils/phases";
import { buildPhaseTimeline, resolveNextStep, raceElapsedSec, formatElapsed } from "@/utils/phaseTimeline";
import { ACTION } from "@/utils/raceTheme";

const STATUS_STYLES = {
  past: "bg-gray-700/50 text-gray-500 border-gray-600",
  current: "bg-cyan-900/80 text-cyan-100 border-cyan-500 ring-1 ring-cyan-400/50",
  next: "bg-amber-950/60 text-amber-200 border-amber-600/60",
  future: "bg-gray-800/40 text-gray-500 border-gray-700",
};

export default function PhaseClock() {
  const { value: race } = useRaceGlobal();
  const { value: phase } = useCurrentPhase();
  const { value: config } = useConfig();
  const { value: crowdDesk } = useCrowdEntropyDesk(race?.current_race_id);
  const active = !!race && !race.is_settled;
  const nowSec = useNowSec(active || !!race);

  const displayKey =
    race?.total_runners === 0 && config?.test_mode
      ? "idle"
      : resolveDisplayPhaseKey(race, config, phase, nowSec);
  const deadline =
    race && !race.is_settled ? nextPhaseDeadline(race, config, nowSec) : null;
  const countdownSec = deadline && deadline.at > nowSec ? deadline.at - nowSec : 0;
  const timeline = useMemo(
    () => buildPhaseTimeline(race, config, phase, nowSec),
    [race, config, phase, nowSec]
  );
  const nextStep = resolveNextStep(timeline);
  const elapsed = formatElapsed(raceElapsedSec(race, nowSec));
  const settlementReady = isSettlementOpen(race, nowSec);

  const flavor = getPhaseFlavor(
    settlementReady ? "settlement" : displayKey ?? "entry",
    {
      runners: race?.total_runners ?? 0,
      crowdCommits: crowdDesk?.commits ?? 0,
      crowdReveals: crowdDesk?.reveals ?? 0,
      betPool: race?.total_bet_pool ?? 0,
    }
  );

  if (!race) return null;

  return (
    <div className="mt-3 space-y-3 border-t border-gray-700 pt-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium text-sm">{flavor.headline}</p>
          <p className="text-gray-400 text-xs mt-0.5">{flavor.subline}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {elapsed != null && (
            <div className="px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-600 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Elapsed</p>
              <p className="text-lg font-mono font-bold text-white tabular-nums">{elapsed}</p>
            </div>
          )}
          {!race.is_settled && deadline && (
            <div
              className={`px-3 py-1.5 rounded-lg border text-center min-w-[5.5rem] ${
                settlementReady
                  ? "bg-purple-950/80 border-purple-500"
                  : "bg-gray-900 border-amber-600/50"
              }`}
            >
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                {settlementReady ? ACTION.revealResults : "Next"}
              </p>
              <p
                className={`text-lg font-mono font-bold tabular-nums ${
                  settlementReady ? "text-purple-200" : "text-amber-300"
                }`}
              >
                {settlementReady ? "OPEN" : formatCountdownClock(countdownSec)}
              </p>
              {!settlementReady && (
                <p className="text-[10px] text-gray-500 truncate max-w-[8rem]">{deadline.label}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {nextStep && !race.is_settled && !settlementReady && (
        <p className="text-xs text-gray-500">
          Up next: <span className="text-gray-300">{nextStep.label}</span>
          {nextStep.remainingLabel ? ` · in ${nextStep.remainingLabel}` : ""}
        </p>
      )}

      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
        {timeline.map((step) => (
          <div
            key={step.id}
            className={`flex-shrink-0 flex flex-col min-w-[4.5rem] px-2 py-1.5 rounded-md border text-center ${STATUS_STYLES[step.status] ?? STATUS_STYLES.future}`}
            title={step.label}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wide truncate">
              {step.shortLabel}
            </span>
            {step.status === "current" && step.remainingLabel && (
              <span className="text-xs font-mono tabular-nums mt-0.5">{step.remainingLabel}</span>
            )}
            {step.status === "next" && step.remainingLabel && (
              <span className="text-[10px] font-mono tabular-nums mt-0.5 opacity-80">
                {step.remainingLabel}
              </span>
            )}
            {step.status === "past" && <span className="text-[10px] mt-0.5 opacity-60">done</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
