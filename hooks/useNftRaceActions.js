"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME, CONTRACT, ENTRY_FEE_UATOM } from "@/config";
import { toUtf8 } from "@interchainjs/encoding";
import { executeContract } from "interchainjs/cosmwasm/wasm/v1/tx.rpc.func";
import toast from "react-hot-toast";
import { assertTxSuccess, parseContractError } from "@/utils/tx";
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
    queryClient.invalidateQueries({ queryKey: ["race_entry"] });
    queryClient.invalidateQueries({ queryKey: ["user"] });
    queryClient.invalidateQueries({ queryKey: ["escrow_vault"] });
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
    mutationFn: async ({ nftContract, tokenId, commitmentB64 }) => {
      const signingClient = await getSigningCosmWasmClient();
      const readClient = await getCosmWasmClient();
      const user = await readClient.queryContractSmart(CONTRACT, { user: { addr: address } });
      const deposits = Number(user?.deposits ?? 0);
      if (deposits < Number(ENTRY_FEE_UATOM)) {
        throw new Error("Not enough ATOM in your vault — deposit first.");
      }

      const innerMsg = buildEnterRaceMsg(commitmentB64);
      const funds = [];

      const msg = {
        send_nft: {
          contract: CONTRACT,
          token_id: String(tokenId),
          msg: innerMsg,
        },
      };

      return toast.promise(
        (async () => {
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
        })(),
        {
          loading: `${ACTION.readyPending} confirming on-chain`,
          success: `${ACTION.ready} confirmed on-chain`,
          error: (err) => parseContractError(err?.message) || "Race entry failed",
        }
      );
    },
    onSuccess: () => {
      invalidateRaceQueries();
    },
  });

  return { queryTokens, enterRace, invalidateRaceQueries };
}
