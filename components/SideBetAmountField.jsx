"use client";

import { formatAtom } from "@/utils/race";

/** User-set wager size — used for every side bet type (tribe, underdog, racer). */
export default function SideBetAmountField({
  id = "side-bet-amount",
  amount,
  onChange,
  disabled = false,
  vaultUatom = 0,
  amountUatom = 0,
  hasValidAmount = false,
  compact = false,
  className = "",
}) {
  const hasVaultFunds = vaultUatom >= amountUatom;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className={`block text-gray-400 uppercase tracking-wide ${
          compact ? "text-[10px] mb-1" : "text-xs mb-1"
        }`}
      >
        Your wager (ATOM)
      </label>
      <input
        id={id}
        type="number"
        min="0"
        step="0.001"
        inputMode="decimal"
        placeholder="e.g. 0.05"
        value={amount}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-gray-950 border border-gray-600 text-white rounded-lg disabled:opacity-50 font-mono ${
          compact ? "text-sm p-2" : "p-2.5"
        }`}
      />
      {hasValidAmount && !hasVaultFunds && (
        <p className={`text-rose-400 mt-1.5 ${compact ? "text-xs" : "text-sm"}`}>
          Need {formatAtom(amountUatom)} ATOM in vault — deposit first.
        </p>
      )}
    </div>
  );
}
