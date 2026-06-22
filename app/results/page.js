"use client";

import Link from "next/link";
import { useRaceHistory } from "@/hooks";
import { formatAtom } from "@/utils/race";

export default function ResultsIndexPage() {
  const { data, isLoading } = useRaceHistory(50);
  const races = data?.pages?.flatMap((p) => p.races ?? []) ?? [];
  const sorted = [...races].sort((a, b) => b.race_id - a.race_id);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Race Results</h1>
          <p className="text-gray-500 text-sm mt-1">Archived finishes — live desk is on the home page.</p>
        </div>
        <Link href="/" className="text-sm font-medium text-blue-400 hover:text-blue-300">
          ← Live race
        </Link>
      </header>

      {isLoading && <p className="text-gray-500">Loading history…</p>}

      {!isLoading && sorted.length === 0 && (
        <p className="text-gray-500 rounded-xl border border-gray-800 bg-gray-900 p-8 text-center">
          No settled races yet.
        </p>
      )}

      <ul className="space-y-2">
        {sorted.map((r) => (
          <li key={r.race_id}>
            <Link
              href={`/results/${r.race_id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-800 bg-gray-900/80 px-4 py-3 hover:border-purple-700/50 hover:bg-gray-900 transition-colors"
            >
              <span className="font-bold text-white">Race #{r.race_id}</span>
              <span className="text-xs text-gray-500">
                {r.total_runners} runners · {formatAtom(r.total_entry_pool)} entry ·{" "}
                {formatAtom(r.total_bet_pool)} bets
              </span>
              <span className="text-sm text-purple-300">View →</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
