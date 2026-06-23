"use client";

import { useMemo, useState } from "react";
import { useRaceRoster } from "@/hooks";
import { shortRunnerName } from "@/utils/race";
import { SPECIES, speciesCapsLabel, speciesKey } from "@/utils/species";

export default function UpcomingRaceEntries({ raceId }) {
  const [open, setOpen] = useState(false);
  const { value: roster, query } = useRaceRoster(raceId);

  const runners = useMemo(
    () => (roster ?? []).filter((r) => r.player),
    [roster]
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        SPECIES.map((s) => [
          s.id,
          runners.filter((r) => speciesKey(r) === s.id).length,
        ])
      ),
    [runners]
  );

  const activeSpecies = useMemo(
    () => SPECIES.filter((s) => counts[s.id] > 0),
    [counts]
  );

  return (
    <div className="mt-3 flex flex-col items-center gap-2 sm:items-start">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-lg border border-carl-accent/50 bg-carl-purple/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-carl-text hover:bg-carl-purple/55"
      >
        {open ? "Hide upcoming entries" : `See race #${raceId} entries`}
      </button>

      {open && (
        <div className="w-full max-w-xl rounded-lg border border-carl-purple/35 bg-carl-midnight/70 p-3 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-carl-muted">
            Race #{raceId} — {runners.length}/75 entered
          </p>

          {query.isLoading && (
            <p className="mt-2 text-sm text-carl-muted">Loading entries…</p>
          )}

          {!query.isLoading && runners.length === 0 && (
            <p className="mt-2 text-sm text-carl-muted">
              No runners signed up yet — entry is open for the next race.
            </p>
          )}

          {activeSpecies.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeSpecies.map((s) => (
                <span
                  key={s.id}
                  className="rounded-md border border-gray-500/40 bg-carl-slate/80 px-2.5 py-1 text-xs font-semibold text-white"
                >
                  {counts[s.id]} {speciesCapsLabel(s)}
                </span>
              ))}
            </div>
          )}

          {runners.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm text-carl-text">
              {runners.map((r) => (
                <li key={r.player} className="truncate">
                  {shortRunnerName(r.player, r.species)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
