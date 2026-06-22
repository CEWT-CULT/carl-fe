"use client";

import { useChain as useInterchainChain } from "@interchain-kit/react";
import { createCosmosQueryClient } from "@interchainjs/cosmos";
import { toUtf8, fromUtf8 } from "@interchainjs/encoding";
import { getBalance as queryBalance } from "interchainjs/cosmos/bank/v1beta1/query.rpc.func";
import { getSmartContractState } from "interchainjs/cosmwasm/wasm/v1/query.rpc.func";

function resolveEndpoint(endpoint) {
  if (typeof endpoint === "string") return endpoint;
  if (endpoint?.url) return endpoint.url;
  return String(endpoint);
}

export function useChain(chainName) {
  const chain = useInterchainChain(chainName);
  const { getRpcEndpoint, getSigningClient } = chain;

  const getQueryClient = async () => {
    const endpoint = await getRpcEndpoint();
    return createCosmosQueryClient(resolveEndpoint(endpoint));
  };

  const getCosmWasmClient = async () => {
    const queryClient = await getQueryClient();
    return {
      queryContractSmart: async (contract, query) => {
        const res = await getSmartContractState(queryClient, {
          address: contract,
          queryData: toUtf8(JSON.stringify(query)),
        });
        return JSON.parse(fromUtf8(res.data));
      },
      getBalance: async (address, denom) => {
        const res = await queryBalance(queryClient, { address, denom });
        return res.balance;
      },
    };
  };

  return {
    ...chain,
    getCosmWasmClient,
    getSigningCosmWasmClient: getSigningClient,
  };
}
