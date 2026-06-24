"use client";

import { useState } from "react";
import { CHAIN_NAME, BASE_DENOM, ENTRY_FEE_ATOM } from "@/config";
import { useChain } from "@/hooks/useChainClient";
import { useExec } from "@/hooks/useExec";
import { useUserBalance, useUser } from "@/hooks";
import { formatAtom } from "@/utils/race";

const MODE_BTN =
  "px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-default";
const MODE_ACTIVE = "bg-carl-accent text-white";
const MODE_IDLE = "bg-carl-midnight/60 text-carl-muted hover:text-carl-text";

export default function VaultManagePanel({
  showBalances = true,
  className = "",
  initialAmount,
  defaultMode = "deposit",
}) {
  const { address } = useChain(CHAIN_NAME);
  const [amount, setAmount] = useState(initialAmount ?? "0.1");
  const [mode, setMode] = useState(defaultMode);
  const { value: balance, query: balanceQuery } = useUserBalance(BASE_DENOM, address);
  const { value: user, query: userQuery } = useUser(address);
  const { deposit, withdraw } = useExec();

  const vaultAtom = user?.deposits ? Number(user.deposits) / 1_000_000 : 0;

  const refetch = () => {
    balanceQuery.refetch();
    userQuery.refetch();
  };

  const parsed = parseFloat(amount) || 0;
  const canDeposit = parsed > 0 && parsed <= parseFloat(balance || 0);
  const canWithdraw = parsed > 0 && parsed <= vaultAtom;

  const run = () => {
    const m = mode === "deposit" ? deposit : withdraw;
    m.mutate({ amount: parsed }, { onSuccess: refetch });
  };

  return (
    <div className={className}>
      {showBalances && (
        <div className="flex flex-wrap gap-4 text-sm mb-3">
          <p className="text-carl-muted">
            Wallet{" "}
            <span className="text-carl-accent font-semibold font-mono">
              {balanceQuery.isLoading ? "…" : `${balance ?? 0} ATOM`}
            </span>
          </p>
          <p className="text-carl-muted">
            Vault{" "}
            <span className="text-carl-text font-semibold font-mono">
              {userQuery.isLoading ? "…" : `${formatAtom(user?.deposits)} ATOM`}
            </span>
          </p>
          <p className="text-carl-muted/80 text-xs self-center">
            Entry fee {ENTRY_FEE_ATOM} ATOM · bets use vault
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-carl-purple/40">
          <button
            type="button"
            onClick={() => setMode("deposit")}
            className={`${MODE_BTN} ${mode === "deposit" ? MODE_ACTIVE : MODE_IDLE}`}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setMode("withdraw")}
            className={`${MODE_BTN} border-l border-carl-purple/40 ${
              mode === "withdraw" ? "bg-carl-plum text-carl-text" : MODE_IDLE
            }`}
          >
            Withdraw
          </button>
        </div>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 bg-gray-950 border border-gray-600 text-white text-sm px-3 py-2 rounded-lg font-mono"
          placeholder="ATOM"
          step="0.01"
          min="0"
        />
        <button
          type="button"
          onClick={run}
          disabled={
            (mode === "deposit" ? !canDeposit : !canWithdraw) ||
            deposit.isPending ||
            withdraw.isPending
          }
          className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:bg-carl-midnight disabled:text-carl-muted/60 ${
            mode === "deposit"
              ? "bg-carl-accent hover:bg-carl-purple disabled:hover:bg-carl-midnight"
              : "bg-carl-plum hover:bg-carl-purple border border-carl-purple/50"
          }`}
        >
          {deposit.isPending || withdraw.isPending
            ? "…"
            : mode === "deposit"
              ? "Deposit"
              : "Withdraw"}
        </button>
      </div>
    </div>
  );
}
