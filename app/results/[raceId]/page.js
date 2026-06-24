"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import SettlementResults from "@/components/SettlementResults";

export default function RaceResultsPage() {
  const params = useParams();
  const raceId = Number(params.raceId);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 flex-1">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href="/results" className="text-sm text-carl-muted hover:text-carl-text font-medium">
          ← All results
        </Link>
        <Link href="/" className="text-sm text-carl-accent hover:text-white font-medium">
          Live race →
        </Link>
      </header>
      <SettlementResults raceId={raceId} />
    </div>
  );
}
