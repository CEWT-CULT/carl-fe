"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME, CONTRACT, BASE_DENOM, ENTRY_FEE_UATOM } from "@/config";
import { toUtf8 } from "@interchainjs/encoding";
import { executeContract } from "interchainjs/cosmwasm/wasm/v1/tx.rpc.func";
import toast from "react-hot-toast";
import { assertTxSuccess } from "@/utils/tx";
import { buildEnterRaceMsg } from "@/utils/race";
import { ACTION } from "@/utils/raceTheme";

export function useNftRaceActions() {
  const { address, getSigningCosmWasmClient, getCosmWasmClient } = useChain(CHAIN_NAME);
  const queryClient = useQueryClient();

  const invalidateRaceQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["race_global"] });
    queryClient.invalidateQueries({ queryKey: ["current_phase"] });
    queryClient.invalidateQueries({ queryKey: ["race_roster"] });
    queryClient.invalidateQueries({ queryKey: ["side_bet_desk"] });
    queryClient.invalidateQueries({ queryKey: ["crowd_entropy_desk"] });
  };

  const queryTokens = async (nftContract) => {
    const readClient = await getCosmWasmClient();
    try {
      const res = await readClient.queryContractSmart(nftContract, {
        tokens: { owner: address, limit: 30 },
      });
      return res.tokens || [];
    } catch {
      return [];
    }
  };

  const enterRace = useMutation({
    mutationFn: async ({ nftContract, tokenId, commitmentB64, payFromVault }) => {
      const signingClient = await getSigningCosmWasmClient();
      const readClient = await getCosmWasmClient();
      const config = await readClient.queryContractSmart(CONTRACT, { config: {} });
      const entryFeeUatom = config?.entry_fee || ENTRY_FEE_UATOM;
      const innerMsg = buildEnterRaceMsg(commitmentB64);
      const funds = payFromVault
        ? []
        : [{ denom: BASE_DENOM, amount: entryFeeUatom }];

      const msg = {
        send_nft: {
          contract: CONTRACT,
          token_id: String(tokenId),
          msg: innerMsg,
        },
      };

      const result = await executeContract(
        signingClient,
        address,
        {
          sender: address,
          contract: nftContract,
          msg: toUtf8(JSON.stringify(msg)),
          funds,
        },
        "auto",
        ""
      );

      return assertTxSuccess(result);
    },
    onSuccess: () => {
      invalidateRaceQueries();
      queryClient.invalidateQueries({ queryKey: ["escrow_vault"] });
      toast.success(`${ACTION.ready}!`);
    },
    onError: (err) => {
      toast.error(err?.message?.slice(0, 120) || "Race entry failed");
    },
  });

  return { queryTokens, enterRace, invalidateRaceQueries };
}
