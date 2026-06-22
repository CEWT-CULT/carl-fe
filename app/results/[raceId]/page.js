"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import SettlementResults from "@/components/SettlementResults";

export default function RaceResultsPage() {
  const params = useParams();
  const raceId = Number(params.raceId);

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <header className="mb-4">
        <Link href="/results" className="text-sm text-gray-500 hover:text-gray-300">
          ← All results
        </Link>
      </header>
      <SettlementResults raceId={raceId} />
    </div>
  );
}
