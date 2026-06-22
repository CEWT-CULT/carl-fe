"use client";

import Link from "next/link";
import { useRaceGlobal, useLatestSettledRace } from "@/hooks";
import { previousWinnerPin } from "@/utils/raceEvents";

export default function LastRaceBanner() {
  const { value: race } = useRaceGlobal();
  const latestSettled = useLatestSettledRace();

  const raceId = race?.current_race_id ?? 0;
  const runners = race?.total_runners ?? 0;

  const showPreviousWinner =
    latestSettled &&
    latestSettled.race_id < raceId &&
    runners === 0 &&
    !race?.is_settled;

  if (!showPreviousWinner) return null;

  const pinnedWinner = previousWinnerPin(latestSettled);

  return (
    <div
      className="px-4 sm:px-6 py-1 border-t border-purple-900/50 bg-[#120a1a]"
      aria-label="Previous race result"
    >
      <p className="text-[11px] text-purple-100 truncate leading-tight">
        <span className="font-bold uppercase tracking-wide text-purple-400/90 mr-2">
          Last race
        </span>
        <span className="font-medium">{pinnedWinner.headline}</span>
        {pinnedWinner.subline && (
          <span className="text-purple-300/70"> — {pinnedWinner.subline}</span>
        )}
        {latestSettled?.race_id && (
          <Link
            href={`/results/${latestSettled.race_id}`}
            className="ml-2 text-purple-400 hover:text-purple-200 underline shrink-0"
          >
            Results
          </Link>
        )}
      </p>
    </div>
  );
}
