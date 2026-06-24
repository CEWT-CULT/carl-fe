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

export const TX_WAIT_MS = 90_000;
export const TX_POLL_MS = 2_000;

export function getTxHash(result) {
  if (!result) return null;
  if (typeof result.transactionHash === "string") return result.transactionHash;
  if (typeof result.txhash === "string") return result.txhash;
  return null;
}

function getBroadcastResponse(result) {
  return result?.broadcastResponse ?? result?.rawResponse ?? result;
}

/** Mempool / CheckTx acceptance — not final execution. */
export function assertBroadcastAccepted(result) {
  const broadcast = getBroadcastResponse(result);
  const code =
    broadcast?.code ??
    broadcast?.checkTx?.code ??
    broadcast?.txResponse?.code;

  if (code != null && Number(code) !== 0) {
    const raw =
      broadcast?.log ??
      broadcast?.rawLog ??
      broadcast?.checkTx?.log ??
      "Transaction rejected by the network";
    throw new Error(parseContractError(raw));
  }
}

function assertDeliverTxSuccess(tx, hash) {
  const code = tx?.code ?? tx?.txResult?.code ?? tx?.txResponse?.code;
  if (code != null && Number(code) !== 0) {
    const raw =
      tx?.rawLog ??
      tx?.log ??
      tx?.txResult?.log ??
      "Transaction failed on-chain";
    const err = new Error(parseContractError(raw));
    if (hash) err.txHash = hash;
    throw err;
  }

  return {
    ...tx,
    txHash: hash ?? tx?.txhash ?? getTxHash(tx),
  };
}

/**
 * Wait for block inclusion, then fail if CosmWasm execution returned a non-zero code.
 * interchainjs returns IBroadcastResult from signAndBroadcast — success toasts were firing
 * after CheckTx only because `code` lives on the waited deliver tx, not the top level.
 */
export async function awaitTxConfirmation(
  result,
  { timeoutMs = TX_WAIT_MS, pollMs = TX_POLL_MS } = {}
) {
  assertBroadcastAccepted(result);

  if (typeof result?.wait === "function") {
    const hash = getTxHash(result);
    try {
      const tx = await result.wait(timeoutMs, pollMs);
      return assertDeliverTxSuccess(tx, hash);
    } catch (err) {
      const msg = err?.message ?? String(err);
      if (msg.includes("not found within timeout")) {
        throw new Error(
          hash
            ? `Transaction ${hash.slice(0, 12)}… timed out — check the explorer before retrying.`
            : "Transaction timed out — check the explorer before retrying."
        );
      }
      if (msg.includes("broadcast failed")) {
        throw new Error(parseContractError(msg));
      }
      throw err;
    }
  }

  return assertDeliverTxSuccess(result, getTxHash(result));
}

/** @deprecated Prefer awaitTxConfirmation — kept as alias for existing call sites. */
export async function assertTxSuccess(result, opts) {
  return awaitTxConfirmation(result, opts);
}

/** Pull a short human-readable line from CosmWasm raw_log JSON. */
export function parseContractError(rawLog) {
  if (!rawLog) return "Transaction failed on-chain";
  const first = String(rawLog).split("\n")[0] || String(rawLog);
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
      if (msg.includes("RevealDelayNotElapsed")) {
        return `Wait 5 minutes after commit before ${ACTION.set} or ${ACTION.cheer} reveal.`;
      }
      if (msg.includes("RevealWindowClosed")) return `${ACTION.set} window is closed for this phase.`;
      if (msg.includes("InvalidCommitment")) {
        return "Commitment mismatch — use the same tactic & salt from when you entered the race.";
      }
      if (msg.includes("AlreadyRevealed")) return `You already hit ${ACTION.set} this race.`;
      if (msg.includes("NotEntered")) return "You are not entered in this race.";
      if (msg.includes("AlreadyEntered")) return "You are already entered in this race.";
      if (msg.includes("AlreadyBet")) return "You already placed a bet this race.";
      if (msg.includes("InsufficientFunds")) return "Not enough ATOM in your vault — deposit first.";
      if (msg.includes("InvalidAmount")) return "Bet amount must be greater than zero.";
      if (msg.includes("InvalidDenomSent")) return "Side bets debit your vault only — do not attach ATOM to the tx.";
      if (msg.includes("InvalidRacerPick")) return "Pick a valid racer for this bet type.";
      if (msg.includes("RaceFull")) return "This race is full — try the next one.";
      if (msg.includes("InvalidNftContract")) return "That NFT collection is not allowed for this race.";
      if (msg.includes("NoSideBet")) return "Place a side bet before crowd commit.";
      if (msg.includes("AlreadyCrowdCommitted")) return "You already committed crowd entropy.";
      if (msg.includes("NotCrowdCommitted")) return "Commit crowd entropy before revealing.";
      if (msg.includes("CrowdEntropyFull")) return "Crowd entropy desk is full.";
      if (msg.includes("SettlementWindowClosed")) return `${ACTION.revealResults} window is closed.`;
      if (msg.includes("AlreadySettled")) return "This race is already settled.";
      return msg.split(":").pop()?.trim() || msg;
    }
  } catch {
    /* not JSON */
  }
  if (first.includes("WrongPhase")) return "This action is closed for the current phase.";
  if (first.includes("out of gas")) {
    return "Transaction ran out of gas — retry (fee limit raised).";
  }
  if (first.includes("insufficient")) return "Not enough ATOM in your vault — deposit first.";
  if (first.includes("not found within timeout")) {
    return "Transaction timed out — check the explorer before retrying.";
  }
  if (first.includes("broadcast failed")) return "Transaction rejected before it reached the chain.";
  return first.slice(0, 200);
}
