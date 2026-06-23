"use client";

import { useFocusedRace } from "@/hooks/useFocusedRace";
import { useRaceView } from "@/context/RaceViewContext";

export default function RaceViewBanner() {
  const { isUpcomingView, liveRaceId, raceId } = useFocusedRace();
  const { showLiveRace } = useRaceView();

  if (!isUpcomingView) return null;

  return (
    <section
      className="mb-4 flex flex-col gap-3 rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-950/60 via-carl-midnight to-amber-950/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
      aria-label="Upcoming race view"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-200/90">
          Upcoming race view
        </p>
        <p className="mt-1 text-lg font-black uppercase text-white sm:text-xl">
          Race #{raceId} — entries &amp; side bets
        </p>
        <p className="mt-1 text-sm text-carl-muted">
          Race #{liveRaceId} is still live on chain. Switch back to watch the current race.
        </p>
      </div>
      <button
        type="button"
        onClick={showLiveRace}
        className="shrink-0 rounded-lg border border-carl-accent/50 bg-carl-purple/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white hover:bg-carl-purple/65"
      >
        Back to live race #{liveRaceId}
      </button>
    </section>
  );
}
