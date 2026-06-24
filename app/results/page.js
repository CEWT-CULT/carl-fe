"use client";

import Link from "next/link";
import RaceResultsList from "@/components/RaceResultsList";

const RESULTS_LIMIT = 10;

export default function ResultsIndexPage() {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex-1">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white">
            Race Results
          </h1>
          <p className="text-carl-muted text-sm mt-1.5">
            Last {RESULTS_LIMIT} archived finishes — tap a race for podium, payouts, and claims.
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold text-carl-accent hover:text-white transition-colors"
        >
          ← Live race
        </Link>
      </header>

      <RaceResultsList limit={RESULTS_LIMIT} />
    </div>
  );
}
