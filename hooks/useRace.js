"use client";
import { useMemo } from "react";
import { useChain } from "@/hooks/useChainClient";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { CHAIN_NAME, CONTRACT } from "@/config";
import { parseEnrollingRace } from "@/utils/phases";

export function useRaceGlobal() {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["race_global"],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, { race_global: {} });
    },
    enabled: !!CONTRACT,
    refetchInterval: 1000 * 3,
  });
  return { value: query.data, query };
}

/** Pipeline race open for entry/bets while the running race is in reveal/live. */
export function useEnrollingRace() {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["enrolling_race"],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      try {
        return await readClient.queryContractSmart(CONTRACT, { enrolling_race: {} });
      } catch {
        return null;
      }
    },
    enabled: !!CONTRACT,
    refetchInterval: 1000 * 5,
    retry: false,
  });
  return { value: query.data ?? null, query };
}

export function useCurrentPhase() {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["current_phase"],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, { current_phase: {} });
    },
    enabled: !!CONTRACT,
    refetchInterval: 1000 * 3,
  });
  return { value: query.data, query };
}

export function useRaceRoster(raceId) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["race_roster", raceId],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, { race_roster: { race_id: raceId } });
    },
    enabled: !!CONTRACT && raceId != null,
    refetchInterval: 1000 * 15,
  });
  return { value: query.data, query };
}

export function useRaceHistory(limit = 20) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);

  return useInfiniteQuery({
    queryKey: ["race_history", limit],
    queryFn: async ({ pageParam }) => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, {
        race_history: {
          start_after: pageParam ?? null,
          limit,
        },
      });
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage?.next ?? undefined,
    enabled: !!CONTRACT,
  });
}

/** Newest archived races (contract returns descending race_id). */
export function useRecentRaceHistory(limit = 10) {
  const query = useRaceHistory(limit);
  const races = useMemo(() => {
    const list = query.data?.pages?.[0]?.races ?? [];
    return list.slice(0, limit);
  }, [query.data, limit]);
  return { races, isLoading: query.isLoading, query };
}

export function useRaceTelemetry(raceId) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["race_telemetry", raceId],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, { race_telemetry: { race_id: raceId } });
    },
    enabled: !!CONTRACT && raceId != null,
    refetchInterval: 1000 * 5,
  });
  return { value: query.data, query };
}

export function useSideBetDesk(raceId, { enabled = true, refetchInterval = 5000 } = {}) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["side_bet_desk", raceId],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, { side_bet_desk: { race_id: raceId } });
    },
    enabled: !!CONTRACT && raceId != null && enabled,
    refetchInterval,
  });
  return { value: query.data, query };
}

export function useSideBet(raceId, address) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["side_bet", raceId, address],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, {
        side_bet: { race_id: raceId, addr: address },
      });
    },
    enabled: !!CONTRACT && !!address && raceId != null,
    refetchInterval: 1000 * 10,
    retry: false,
  });
  return { value: query.data, query };
}

export function useRaceEntry(raceId, address) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["race_entry", raceId, address],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, {
        race_entry: { race_id: raceId, addr: address },
      });
    },
    enabled: !!CONTRACT && !!address && raceId != null,
    retry: false,
  });
  return { value: query.data, query };
}

/** All racer NFTs escrowed in the contract for this wallet (across recent races). */
export function useEscrowVault(address) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const { value: race } = useRaceGlobal();
  const { value: enrollingRaw } = useEnrollingRace();
  const enrolling = parseEnrollingRace(enrollingRaw);
  const { data: historyData } = useRaceHistory(50);

  const raceIds = useMemo(() => {
    const ids = new Set();
    const history = historyData?.pages?.flatMap((p) => p.races ?? []) ?? [];
    history.forEach((r) => ids.add(r.race_id));
    if (race?.current_race_id) ids.add(race.current_race_id);
    if (enrolling?.current_race_id) ids.add(enrolling.current_race_id);
    return [...ids].sort((a, b) => b - a);
  }, [historyData, race?.current_race_id, enrolling?.current_race_id]);

  const query = useQuery({
    queryKey: ["escrow_vault", address, raceIds.join(",")],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      const items = await Promise.all(
        raceIds.map(async (raceId) => {
          try {
            const entry = await readClient.queryContractSmart(CONTRACT, {
              race_entry: { race_id: raceId, addr: address },
            });
            return { raceId, entry };
          } catch {
            return null;
          }
        })
      );
      return items.filter(Boolean);
    },
    enabled: !!CONTRACT && !!address && raceIds.length > 0,
    refetchInterval: 1000 * 10,
  });

  return { items: query.data ?? [], query, raceIds };
}

export function useRacePreview(raceId, { enabled = true } = {}) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["race_preview", raceId],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, {
        race_preview: { race_id: raceId },
      });
    },
    enabled: !!CONTRACT && raceId != null && enabled,
    refetchInterval: 1000 * 8,
  });
  return { value: query.data, query };
}

export function useCrowdEntropy(raceId, address) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["crowd_entropy", raceId, address],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, {
        crowd_entropy: { race_id: raceId, addr: address },
      });
    },
    enabled: !!CONTRACT && !!address && raceId != null,
    refetchInterval: 1000 * 10,
    retry: false,
  });
  return { value: query.data, query };
}

export function useCrowdEntropyDesk(raceId) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["crowd_entropy_desk", raceId],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, {
        crowd_entropy_desk: { race_id: raceId },
      });
    },
    enabled: !!CONTRACT && raceId != null,
    refetchInterval: 1000 * 10,
  });
  return { value: query.data, query };
}

export function useSideBetSettlement(raceId, { enabled = true } = {}) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["side_bet_settlement", raceId],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, {
        side_bet_settlement: { race_id: raceId },
      });
    },
    enabled: !!CONTRACT && raceId != null && enabled,
    refetchInterval: 1000 * 10,
    retry: false,
  });
  return { value: query.data, query };
}

/** Single race from paginated on-chain history. */
export function useRaceHistoryEntry(raceId) {
  const { data: historyData, isLoading } = useRaceHistory(100);
  const entry = useMemo(() => {
    if (!raceId) return null;
    const races = historyData?.pages?.flatMap((p) => p.races ?? []) ?? [];
    return races.find((r) => r.race_id === raceId) ?? null;
  }, [historyData, raceId]);
  return { entry, isLoading };
}

/** Most recently archived race (for main-page results link). */
export function useLatestSettledRace() {
  const { data: historyData } = useRaceHistory(20);
  return useMemo(() => {
    const races = historyData?.pages?.flatMap((p) => p.races ?? []) ?? [];
    if (!races.length) return null;
    return [...races].sort((a, b) => b.race_id - a.race_id)[0];
  }, [historyData]);
}
