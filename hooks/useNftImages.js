"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { fetchNftImageUrl, nftImageKey } from "@/utils/nftMetadata";

/** Batch-resolve CW721 token images for track / vault display. */
export function useNftImages(runners) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);

  const tokens = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const r of runners ?? []) {
      const contract = r.nft_contract;
      const tokenId = r.nft_id;
      const key = nftImageKey(contract, tokenId);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push({ contract, tokenId, key });
    }
    return list;
  }, [runners]);

  const query = useQuery({
    queryKey: ["nft_images", tokens.map((t) => t.key).join("|")],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      const map = {};
      await Promise.all(
        tokens.map(async ({ contract, tokenId, key }) => {
          map[key] = await fetchNftImageUrl(readClient, contract, tokenId);
        })
      );
      return map;
    },
    enabled: tokens.length > 0,
    staleTime: 1000 * 60 * 30,
    retry: 1,
  });

  return { images: query.data ?? {}, isLoading: query.isLoading };
}
