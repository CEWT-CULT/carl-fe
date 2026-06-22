"use client";
import { useChain } from "@/hooks/useChainClient";
import { useQuery } from "@tanstack/react-query";
import { CHAIN_NAME, CONTRACT } from "@/config";

export function useConfig() {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);
  const query = useQuery({
    queryKey: ["config"],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, { config: {} });
    },
    enabled: !!CONTRACT,
    refetchInterval: 1000 * 180,
  });
  return { value: query.data, query };
}
