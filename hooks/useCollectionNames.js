"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { fetchCollectionName } from "@/utils/nftMetadata";

/** Batch-resolve CW721 collection names for desk / settlement labels. */
export function useCollectionNames(contracts) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);

  const unique = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const c of contracts ?? []) {
      if (!c || seen.has(c)) continue;
      seen.add(c);
      list.push(c);
    }
    return list.sort();
  }, [contracts]);

  const query = useQuery({
    queryKey: ["collection_names", unique.join("|")],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      const map = {};
      await Promise.all(
        unique.map(async (contract) => {
          map[contract] = await fetchCollectionName(readClient, contract);
        })
      );
      return map;
    },
    enabled: unique.length > 0,
    staleTime: 1000 * 60 * 60,
    retry: 1,
  });

  return { names: query.data ?? {}, isLoading: query.isLoading };
}
