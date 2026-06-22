"use client";
import { CHAIN_NAME, BASE_DENOM } from "@/config";
import { useChain } from "@/hooks/useChainClient";
import { useState } from "react";
import { useExec } from "@/hooks/useExec";
import { useUserBalance, useUser } from "@/hooks";
import { formatAtom } from "@/utils/race";
import { ACTION } from "@/utils/raceTheme";
import { ENTRY_FEE_ATOM } from "@/config";

export default function DepositCard({ onGoToEnter }) {
  const { address } = useChain(CHAIN_NAME);
  const [amount, setAmount] = useState("1");
  const [activeTab, setActiveTab] = useState("deposit");
  const { value: balance, query: balanceQuery } = useUserBalance(BASE_DENOM, address);
  const { value: user, query: userQuery } = useUser(address);
  const { deposit, withdraw } = useExec();

  const vaultAtom = user?.deposits ? Number(user.deposits) / 1_000_000 : 0;
  const readyToEnter = vaultAtom >= ENTRY_FEE_ATOM;

  const refetch = () => {
    balanceQuery.refetch();
    userQuery.refetch();
  };

  const handleDeposit = () => {
    deposit.mutate({ amount: parseFloat(amount) }, { onSuccess: refetch });
  };

  const handleWithdraw = () => {
    withdraw.mutate({ amount: parseFloat(amount) }, { onSuccess: refetch });
  };

  const isDepositDisabled = parseFloat(amount) > parseFloat(balance || 0);
  const isWithdrawDisabled = vaultAtom === 0 || parseFloat(amount) > vaultAtom;

  return (
    <div className="bg-carl-slate border border-carl-purple/25 p-6 rounded-xl">
      <h2 className="text-xl font-bold text-carl-text mb-2">Vault</h2>
      <p className="text-carl-muted text-sm mb-4">
        Isolate race funds from your wallet. Side bets always use vault balance.
      </p>

      <div className="flex mb-4 border-b border-carl-purple/30">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "deposit"
              ? "text-carl-accent border-b-2 border-carl-accent"
              : "text-carl-muted"
          }`}
          onClick={() => setActiveTab("deposit")}
        >
          Deposit
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === "withdraw"
              ? "text-carl-text border-b-2 border-carl-purple"
              : "text-carl-muted"
          }`}
          onClick={() => setActiveTab("withdraw")}
        >
          Withdraw
        </button>
      </div>

      <p className="text-carl-muted mb-1">
        Wallet:{" "}
        <span className="text-carl-accent font-mono">
          {balanceQuery.isLoading ? "…" : `${balance || 0} ATOM`}
        </span>
      </p>
      <p className="text-carl-muted mb-4">
        Vault:{" "}
        <span className="text-carl-text font-mono">
          {userQuery.isLoading ? "…" : `${formatAtom(user?.deposits)} ATOM`}
        </span>
      </p>

      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full bg-gray-950 border border-gray-600 text-white px-4 py-2 rounded-lg mb-3 font-mono"
        placeholder="Amount in ATOM"
      />

      {activeTab === "deposit" ? (
        <button
          onClick={handleDeposit}
          disabled={isDepositDisabled || deposit.isPending}
          className="w-full bg-carl-accent hover:bg-carl-purple disabled:bg-carl-midnight disabled:text-carl-muted text-white font-bold py-2 rounded-lg transition-colors"
        >
          {deposit.isPending ? "Depositing…" : "Deposit to Vault"}
        </button>
      ) : (
        <button
          onClick={handleWithdraw}
          disabled={isWithdrawDisabled || withdraw.isPending}
          className="w-full bg-carl-plum hover:bg-carl-purple disabled:bg-carl-midnight disabled:text-carl-muted text-white font-bold py-2 rounded-lg border border-carl-purple/50 transition-colors"
        >
          {withdraw.isPending ? "Withdrawing…" : "Withdraw from Vault"}
        </button>
      )}

      {readyToEnter && onGoToEnter && (
        <div className="mt-4 rounded-lg border border-carl-purple/40 bg-carl-midnight/50 p-4">
          <p className="text-carl-accent text-sm font-medium mb-1">Vault funded — next step</p>
          <p className="text-carl-muted text-xs mb-3">
            Entry is on the <strong className="text-carl-text">{ACTION.ready}</strong> tab. You need a
            Chicken, Newt, or other allowed NFT in your wallet. The {ENTRY_FEE_ATOM} ATOM fee can come
            from your vault.
          </p>
          <button
            type="button"
            onClick={onGoToEnter}
            className="w-full bg-carl-purple hover:bg-carl-navy text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go to {ACTION.ready} →
          </button>
        </div>
      )}
    </div>
  );
}
