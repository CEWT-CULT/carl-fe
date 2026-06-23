"use client";

import { useChain } from "@/hooks/useChainClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CHAIN_NAME, CONTRACT, BASE_DENOM } from "@/config";
import { toUtf8 } from "@interchainjs/encoding";
import { executeContract } from "interchainjs/cosmwasm/wasm/v1/tx.rpc.func";
import toast from "react-hot-toast";
import { assertTxSuccess, parseContractError, buildStdFee, EXEC_GAS } from "@/utils/tx";
import { toWasmBetType } from "@/utils/sideBets";
import { toWasmRaceAction } from "@/utils/race";
import { ACTION } from "@/utils/raceTheme";

export function useExec() {
  const { address, getSigningCosmWasmClient } = useChain(CHAIN_NAME);
  const queryClient = useQueryClient();

  const invalidateBetQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["side_bet"] });
    queryClient.invalidateQueries({ queryKey: ["side_bet_desk"] });
    queryClient.invalidateQueries({ queryKey: ["side_bet_settlement"] });
    queryClient.invalidateQueries({ queryKey: ["race_global"] });
    queryClient.invalidateQueries({ queryKey: ["user"] });
  };

  const execute = async (msg, funds = [], contract = CONTRACT, fee = "auto") => {
    const signingClient = await getSigningCosmWasmClient();
    const result = await executeContract(
      signingClient,
      address,
      {
        sender: address,
        contract,
        msg: toUtf8(JSON.stringify(msg)),
        funds,
      },
      fee,
      ""
    );
    return assertTxSuccess(result);
  };

  const toastExec = (promise, messages) =>
    toast.promise(promise, {
      ...messages,
      error: (err) => parseContractError(err?.message) || messages.error,
    });

  const deposit = useMutation({
    mutationFn: async ({ amount }) => {
      const msg = { deposit: {} };
      const funds = [{ denom: BASE_DENOM, amount: Math.floor(amount * 1_000_000).toString() }];
      return toastExec(execute(msg, funds), {
        loading: "Depositing to vault...",
        success: "Vault deposit successful",
        error: "Deposit failed",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user"] }),
  });

  const withdraw = useMutation({
    mutationFn: async ({ amount }) => {
      const msg = { withdraw: { amount: Math.floor(amount * 1_000_000).toString() } };
      return toastExec(execute(msg), {
        loading: "Withdrawing from vault...",
        success: "Withdrawal successful",
        error: "Withdrawal failed",
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user"] }),
  });

  const placeSideBet = useMutation({
    mutationFn: async ({ betType, amountUatom, pick }) => {
      const msg = {
        place_side_bet: {
          bet_type: toWasmBetType(betType),
          amount: String(amountUatom),
          ...(pick ? { pick } : {}),
        },
      };
      return toastExec(execute(msg), {
        loading: "Placing bet...",
        success: "Bet placed from vault",
        error: "Bet failed",
      });
    },
    onSuccess: invalidateBetQueries,
  });

  const revealRace = useMutation({
    mutationFn: async ({ action, salt }) => {
      const msg = {
        reveal_race: {
          action: toWasmRaceAction(action),
          salt: String(salt),
        },
      };
      return toastExec(execute(msg, [], CONTRACT, buildStdFee(EXEC_GAS.revealRace)), {
        loading: `${ACTION.setPending}`,
        success: `${ACTION.set} on-chain`,
        error: `${ACTION.set} failed`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["race_entry"] });
      queryClient.invalidateQueries({ queryKey: ["race_roster"] });
      queryClient.invalidateQueries({ queryKey: ["current_phase"] });
      queryClient.invalidateQueries({ queryKey: ["race_global"] });
    },
  });

  const commitCrowdEntropy = useMutation({
    mutationFn: async ({ commitmentB64 }) => {
      const msg = { commit_crowd_entropy: { commitment: commitmentB64 } };
      return toastExec(execute(msg), {
        loading: "Committing crowd salt...",
        success: "Crowd salt committed",
        error: "Crowd commit failed",
      });
    },
  });

  const revealCrowdEntropy = useMutation({
    mutationFn: async ({ salt }) => {
      const msg = { reveal_crowd_entropy: { salt } };
      return toastExec(execute(msg), {
        loading: `${ACTION.cheerPending}`,
        success: "Crowd salt cheered",
        error: `${ACTION.cheer} failed`,
      });
    },
  });

  const settleRace = useMutation({
    mutationFn: async () => {
      const msg = { settle_race: {} };
      return toastExec(execute(msg, [], CONTRACT, buildStdFee(EXEC_GAS.settleRace)), {
        loading: `${ACTION.revealResultsPending}`,
        success: "Race results revealed",
        error: `${ACTION.revealResults} failed`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["race_global"] });
      queryClient.invalidateQueries({ queryKey: ["race_telemetry"] });
      queryClient.invalidateQueries({ queryKey: ["race_preview"] });
      queryClient.invalidateQueries({ queryKey: ["race_roster"] });
      queryClient.invalidateQueries({ queryKey: ["side_bet_settlement"] });
      queryClient.invalidateQueries({ queryKey: ["side_bet_desk"] });
      queryClient.invalidateQueries({ queryKey: ["race_history"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });

  const crankRacePreview = useMutation({
    mutationFn: async () => {
      const msg = { crank_race_preview: {} };
      return toastExec(execute(msg, [], CONTRACT, buildStdFee(EXEC_GAS.crankRacePreview)), {
        loading: `${ACTION.cheerPending}`,
        success: "Track progress advanced",
        error: `${ACTION.cheer} failed`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["race_global"] });
      queryClient.invalidateQueries({ queryKey: ["race_preview"] });
    },
  });

  const commitHouseSeed = useMutation({
    mutationFn: async ({ commitment }) => {
      const msg = { commit_house_seed: { commitment } };
      return toastExec(execute(msg), {
        loading: "Committing house seed hash...",
        success: "House seed committed",
        error: "Commit failed",
      });
    },
  });

  const advanceRace = useMutation({
    mutationFn: async () => {
      const msg = { advance_race: {} };
      return toastExec(execute(msg), {
        loading: "Advancing to next race...",
        success: "Next race started",
        error: "Advance failed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["race_global"] });
      queryClient.invalidateQueries({ queryKey: ["enrolling_race"] });
    },
  });

  const openNextRace = useMutation({
    mutationFn: async () => {
      const msg = { open_next_race: {} };
      return toastExec(execute(msg), {
        loading: "Opening next race...",
        success: "Next race is open for entry",
        error: "Could not open next race",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrolling_race"] });
      queryClient.invalidateQueries({ queryKey: ["race_global"] });
    },
  });

  const claimRacerNft = useMutation({
    mutationFn: async ({ raceId }) => {
      const msg = { claim_racer_nft: { race_id: raceId } };
      return toastExec(execute(msg), {
        loading: "Claiming escrowed NFT...",
        success: "NFT returned to wallet",
        error: "Claim failed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["escrow_vault"] });
      queryClient.invalidateQueries({ queryKey: ["race_entry"] });
      queryClient.invalidateQueries({ queryKey: ["race_roster"] });
    },
  });

  const claimWager = useMutation({
    mutationFn: async ({ raceId }) => {
      const msg = { claim_wager: { race_id: raceId } };
      return toastExec(execute(msg), {
        loading: "Claiming wager payout...",
        success: "Winnings credited to vault",
        error: "Claim failed",
      });
    },
    onSuccess: () => {
      invalidateBetQueries();
    },
  });

  const adminRainOut = useMutation({
    mutationFn: async () => {
      const msg = { admin_rain_out_race: {} };
      return toastExec(execute(msg), {
        loading: "Raining out race (full refunds)…",
        success: "Race rained out — NFTs claimable",
        error: "Rain-out failed",
      });
    },
  });

  const rainOutRace = useMutation({
    mutationFn: async () => {
      const msg = { rain_out_race: {} };
      return toastExec(execute(msg), {
        loading: "Raining out race…",
        success: "Race rained out — next race opening",
        error: "Rain-out failed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["race_entry"] });
      queryClient.invalidateQueries({ queryKey: ["race_roster"] });
      queryClient.invalidateQueries({ queryKey: ["current_phase"] });
      queryClient.invalidateQueries({ queryKey: ["race_global"] });
      queryClient.invalidateQueries({ queryKey: ["enrolling_race"] });
      queryClient.invalidateQueries({ queryKey: ["side_bet_desk"] });
      queryClient.invalidateQueries({ queryKey: ["race_history"] });
    },
  });

  return {
    execute,
    deposit,
    withdraw,
    placeSideBet,
    revealRace,
    commitCrowdEntropy,
    revealCrowdEntropy,
    settleRace,
    crankRacePreview,
    commitHouseSeed,
    advanceRace,
    openNextRace,
    claimRacerNft,
    claimWager,
    adminRainOut,
    rainOutRace,
  };
}
