"use client";

import { useRaceGlobal, useCurrentPhase, useConfig } from "@/hooks";
import { useNowSec } from "@/hooks/useNowSec";
import {
  nextPhaseDeadline,
  formatCountdownClock,
  phaseKey,
  PHASE_SHORT,
  isSettlementOpen,
  resolveDisplayPhaseKey,
} from "@/utils/phases";
import { ACTION } from "@/utils/raceTheme";

export default function MiniPhaseTimer() {
  const { value: race } = useRaceGlobal();
  const { value: phase } = useCurrentPhase();
  const { value: config } = useConfig();
  const nowSec = useNowSec(!!race && !race?.is_settled);
  if (!race || race.is_settled) return null;

  const deadline = nextPhaseDeadline(race, config, nowSec);
  const key = resolveDisplayPhaseKey(race, config, phase, nowSec);
  const settlementReady = isSettlementOpen(race, nowSec);
  const remaining =
    deadline && deadline.at > nowSec ? Math.max(0, deadline.at - nowSec) : settlementReady ? 0 : null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs rounded-md border border-gray-600/60 bg-gray-900/50 px-3 py-2">
      <span className="text-gray-500">Now</span>
      <span className="font-medium text-gray-200">{PHASE_SHORT[key] ?? key ?? "…"}</span>
      {deadline?.nextPhase && (
        <>
          <span className="text-gray-600">→</span>
          <span className="text-gray-400">{PHASE_SHORT[deadline.nextPhase] ?? deadline.nextPhase}</span>
        </>
      )}
      {remaining != null && (
        <span className="ml-auto font-mono tabular-nums text-amber-300">
          {settlementReady ? `${ACTION.revealResults} OPEN` : formatCountdownClock(remaining)}
          {!settlementReady && deadline?.label && (
            <span className="text-gray-500 font-sans ml-1">({deadline.label})</span>
          )}
        </span>
      )}
    </div>
  );
}
