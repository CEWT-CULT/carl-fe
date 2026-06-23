"use client";

import { useRaceView } from "@/context/RaceViewContext";

export default function UpcomingRaceEntriesToggle({ raceId }) {
  const { showUpcoming, showUpcomingRace } = useRaceView();

  if (showUpcoming) return null;

  const handleClick = () => {
    showUpcomingRace();
    requestAnimationFrame(() => {
      document.getElementById("race-arena")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="mt-3 flex flex-col items-center sm:items-start">
      <button
        type="button"
        onClick={handleClick}
        className="rounded-lg border border-carl-accent/50 bg-carl-purple/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-carl-text hover:bg-carl-purple/55"
      >
        See race #{raceId} entries
      </button>
    </div>
  );
}
