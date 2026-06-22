import { ACTION } from "./raceTheme";
import { BASE_DENOM, GAS_PRICE } from "@/config";

/** Build a fixed gas fee (uatom) for heavy CosmWasm executes. */
export function buildStdFee(gasLimit) {
  const gas = Math.ceil(gasLimit);
  const feeUatom = Math.ceil(gas * Number(GAS_PRICE));
  return {
    gas: String(gas),
    amount: [{ denom: BASE_DENOM, amount: String(feeUatom) }],
  };
}

/** Fixed gas for executes where wallet "auto" sim can return gasLimit 0. */
export const EXEC_GAS = {
  revealRace: 500_000,
  crankRacePreview: 5_000_000,
  settleRace: 8_000_000,
};

/** Fail the mutation if the chain rejected the tx (toast was showing false success). */
export function assertTxSuccess(result) {
  const code = result?.code ?? result?.txResponse?.code;
  if (code != null && Number(code) !== 0) {
    const raw = result?.rawLog ?? result?.txResponse?.rawLog ?? "Transaction failed on-chain";
    throw new Error(parseContractError(raw));
  }
  return result;
}

/** Pull a short human-readable line from CosmWasm raw_log JSON. */
export function parseContractError(rawLog) {
  if (!rawLog) return "Transaction failed on-chain";
  const first = rawLog.split("\n")[0] || rawLog;
  try {
    const parsed = JSON.parse(first);
    const msg = parsed?.message ?? parsed?.raw_log;
    if (typeof msg === "string") {
      if (msg.includes("PreviewCrankTooSoon")) return `Wait one minute between ${ACTION.cheer} calls.`;
      if (msg.includes("RacePreviewClosed")) return `Race hasn't started yet — wait for ${ACTION.cheer} to close.`;
      if (msg.includes("PreviewComplete")) return "Race preview is already at 100%.";
      if (msg.includes("out of gas") || first.includes("out of gas")) {
        return "Transaction ran out of gas — retry (fee limit raised).";
      }
      if (msg.includes("RevealDelayNotElapsed")) return `Wait 5 minutes after commit before ${ACTION.set} or ${ACTION.cheer} reveal.`;
      if (msg.includes("RevealWindowClosed")) return `${ACTION.set} window is closed for this phase.`;
      if (msg.includes("InvalidCommitment")) {
        return "Commitment mismatch — use the same tactic & salt from when you entered the race.";
      }
      if (msg.includes("AlreadyRevealed")) return `You already hit ${ACTION.set} this race.`;
      if (msg.includes("NotEntered")) return "You are not entered in this race.";
      if (msg.includes("AlreadyBet")) return "You already placed a bet this race.";
      if (msg.includes("InsufficientFunds")) return "Not enough ATOM in your vault — deposit first.";
      if (msg.includes("InvalidAmount")) return "Bet amount must be greater than zero.";
      if (msg.includes("InvalidDenomSent")) return "Side bets debit your vault only — do not attach ATOM to the tx.";
      return msg.split(":").pop()?.trim() || msg;
    }
  } catch {
    /* not JSON */
  }
  if (first.includes("WrongPhase")) return "Betting desk is closed for this phase.";
  if (first.includes("out of gas")) {
    return "Transaction ran out of gas — retry (fee limit raised).";
  }
  if (first.includes("insufficient")) return "Not enough ATOM in your vault — deposit first.";
  return first.slice(0, 160);
}
