"use client";
import { useChain } from "@/hooks/useChainClient";
import { useQuery } from "@tanstack/react-query";
import { CHAIN_NAME, CONTRACT } from "@/config";

export function useUser(address) {
  const { getCosmWasmClient } = useChain(CHAIN_NAME);

  const query = useQuery({
    queryKey: ["user", address],
    queryFn: async () => {
      const readClient = await getCosmWasmClient();
      return readClient.queryContractSmart(CONTRACT, { user: { addr: address } });
    },
    enabled: !!address && !!CONTRACT,
    refetchInterval: 1000 * 30,
  });
  return { value: query.data, query };
}
