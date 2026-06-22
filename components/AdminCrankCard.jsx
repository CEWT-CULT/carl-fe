"use client";

import { useConfig, useRaceGlobal } from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { useExec } from "@/hooks/useExec";
import { CHAIN_NAME } from "@/config";

export default function AdminCrankCard() {
  const { address } = useChain(CHAIN_NAME);
  const { value: config } = useConfig();
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { adminRainOut, advanceRace } = useExec();

  const isAdmin = address && config?.admin && address === config.admin;
  if (!isAdmin) return null;

  const refetch = () => raceQuery.refetch();

  return (
    <div className="bg-red-950/40 border border-red-800 rounded-lg p-4 mb-6">
      <h3 className="text-red-200 font-semibold mb-1">Admin Crank</h3>
      <p className="text-red-200/70 text-xs mb-3">
        Emergency rain-out refunds all stakes. Advance starts the next idle race after settlement.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={race?.is_settled || adminRainOut.isPending}
          onClick={() => adminRainOut.mutate(undefined, { onSuccess: refetch })}
          className="px-3 py-2 rounded bg-red-800 hover:bg-red-700 disabled:bg-gray-700 text-white text-sm"
        >
          {adminRainOut.isPending ? "Raining out…" : "Rain Out Race"}
        </button>
        <button
          type="button"
          disabled={!race?.is_settled || advanceRace.isPending}
          onClick={() => advanceRace.mutate({}, { onSuccess: refetch })}
          className="px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white text-sm"
        >
          {advanceRace.isPending ? "Advancing…" : "Advance Race"}
        </button>
      </div>
      {race && (
        <p className="text-red-200/50 text-xs mt-2 font-mono">
          Race #{race.current_race_id} · settled={String(race.is_settled)} · test_mode=
          {String(config?.test_mode)}
        </p>
      )}
    </div>
  );
}
