"use client";

import { useChain as useInterchainChain } from "@interchain-kit/react";
import { createCosmosQueryClient } from "@interchainjs/cosmos";
import { getSigner, COSMOS_AMINO } from "interchainjs";
import { toUtf8, fromUtf8 } from "@interchainjs/encoding";
import { getBalance as queryBalance } from "interchainjs/cosmos/bank/v1beta1/query.rpc.func";
import { getSmartContractState } from "interchainjs/cosmwasm/wasm/v1/query.rpc.func";
import { BASE_DENOM, GAS_PRICE } from "@/config";

function resolveEndpoint(endpoint) {
  if (typeof endpoint === "string") return endpoint;
  if (endpoint?.url) return endpoint.url;
  return String(endpoint);
}

/** Ledger (and other HW wallets) only expose signAmino via Keplr. */
function isAminoOnlySigner(signer) {
  return (
    signer &&
    typeof signer.signAmino === "function" &&
    typeof signer.signDirect !== "function"
  );
}

export function useChain(chainName) {
  const chain = useInterchainChain(chainName);
  const { getRpcEndpoint, getSigningClient, wallet, chain: chainInfo } = chain;

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

  const getSigningCosmWasmClient = async () => {
    if (wallet) {
      const offlineSigner = await wallet.getOfflineSigner();
      if (isAminoOnlySigner(offlineSigner)) {
        const queryClient = await getQueryClient();
        return getSigner(offlineSigner, {
          preferredSignType: COSMOS_AMINO,
          signerOptions: {
            queryClient,
            addressPrefix: chainInfo.bech32Prefix,
            chainId: chainInfo.chainId,
            gasPrice: `${GAS_PRICE}${BASE_DENOM}`,
            multiplier: 1.5,
          },
        });
      }
    }
    return getSigningClient();
  };

  return {
    ...chain,
    getCosmWasmClient,
    getSigningCosmWasmClient,
  };
}
