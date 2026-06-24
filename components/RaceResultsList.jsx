"use client";

import Link from "next/link";
import { useRecentRaceHistory } from "@/hooks";
import { formatAtom, formatSettledAt, shortAddr } from "@/utils/race";
import { computeFirstPrize } from "@/utils/settlementPayouts";
import { ACTION } from "@/utils/raceTheme";

const RESULTS_LIMIT = 10;

function outcomeLabel(race) {
  if (race.rained_out) {
    return { text: "Rained out", className: "text-amber-300" };
  }
  if (race.winner) {
    return { text: `Winner ${shortAddr(race.winner)}`, className: "text-carl-accent" };
  }
  return { text: "Settled", className: "text-carl-muted" };
}

function RaceResultRow({ race }) {
  const outcome = outcomeLabel(race);
  const firstPrize = computeFirstPrize(race.total_entry_pool ?? 0);

  return (
    <li>
      <Link
        href={`/results/${race.race_id}`}
        className="group block rounded-xl border border-carl-purple/30 bg-carl-slate/80 px-4 py-4 sm:px-5 hover:border-carl-accent/45 hover:bg-carl-midnight/80 transition-colors"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-lg font-black text-white group-hover:text-carl-text">
              Race #{race.race_id}
            </p>
            <p className={`mt-1 text-sm font-semibold ${outcome.className}`}>{outcome.text}</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wide text-carl-purple group-hover:text-carl-accent">
            Full results →
          </span>
        </div>

        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <dt className="text-carl-muted uppercase tracking-wide">Runners</dt>
            <dd className="mt-0.5 font-mono text-carl-text">{race.total_runners ?? 0}</dd>
          </div>
          <div>
            <dt className="text-carl-muted uppercase tracking-wide">1st prize</dt>
            <dd className="mt-0.5 font-mono text-amber-200">{formatAtom(firstPrize)} ATOM</dd>
          </div>
          <div>
            <dt className="text-carl-muted uppercase tracking-wide">Bet pool</dt>
            <dd className="mt-0.5 font-mono text-carl-text">
              {formatAtom(race.total_bet_pool)} ATOM
            </dd>
          </div>
          <div>
            <dt className="text-carl-muted uppercase tracking-wide">Settled</dt>
            <dd className="mt-0.5 font-mono text-carl-muted">{formatSettledAt(race.settled_at)}</dd>
          </div>
        </dl>
      </Link>
    </li>
  );
}

export default function RaceResultsList({ limit = RESULTS_LIMIT }) {
  const { races, isLoading } = useRecentRaceHistory(limit);

  if (isLoading) {
    return <p className="text-carl-muted text-sm py-8 text-center">Loading race history…</p>;
  }

  if (!races.length) {
    return (
      <p className="text-carl-muted rounded-xl border border-carl-purple/25 bg-carl-slate/60 p-10 text-center text-sm">
        No settled races yet. Results appear here after {ACTION.revealResults.toLowerCase()}.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {races.map((race) => (
        <RaceResultRow key={race.race_id} race={race} />
      ))}
    </ul>
  );
}
