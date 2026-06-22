"use client";

import { useRaceGlobal, useCurrentPhase, useConfig } from "@/hooks";
import { useExec } from "@/hooks/useExec";
import { phaseKey, PHASE_LABELS } from "@/utils/phases";
import PhaseClock from "@/components/PhaseClock";

export default function PhaseBanner() {
  const { value: phase } = useCurrentPhase();
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { value: config } = useConfig();
  const { advanceRace } = useExec();
  const key = phaseKey(phase);
  const label =
    race?.total_runners === 0 && config?.test_mode
      ? PHASE_LABELS.idle
      : key
        ? PHASE_LABELS[key] || key
        : "Loading phase…";

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="w-full">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-lg font-semibold text-white">{label}</p>
            {race?.is_settled && (
              <span className="px-3 py-1 bg-purple-900 text-purple-200 rounded text-sm font-medium">
                Results locked
              </span>
            )}
          </div>
          {race && (
            <p className="text-gray-400 text-sm mt-1">
              Race #{race.current_race_id} · {race.total_runners}/75 runners · Pools:{" "}
              {Number(race.total_entry_pool) / 1e6} ATOM entry /{" "}
              {Number(race.total_bet_pool) / 1e6} ATOM bets
            </p>
          )}
        </div>
        {race?.is_settled && !config?.test_mode && (
          <button
            type="button"
            disabled={advanceRace.isPending}
            onClick={() => advanceRace.mutate(undefined, { onSuccess: () => raceQuery.refetch() })}
            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded text-sm font-medium"
          >
            {advanceRace.isPending ? "Advancing…" : "Advance to next race"}
          </button>
        )}
      </div>
      <PhaseClock />
    </div>
  );
}
