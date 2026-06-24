"use client";

import { ENTRY_FEE_ATOM, ENTRY_FEE_UATOM } from "@/config";
import { formatAtom } from "@/utils/race";

export function hasVaultEntryFunds(vaultUatom) {
  return Number(vaultUatom ?? 0) >= Number(ENTRY_FEE_UATOM);
}

export default function VaultEntryFundsNotice({ vaultUatom, loading = false, className = "" }) {
  const ready = hasVaultEntryFunds(vaultUatom);

  return (
    <div
      className={`rounded-lg border p-3 text-sm ${
        ready
          ? "border-gray-700/60 bg-gray-900/50 text-gray-400"
          : "border-amber-700/40 bg-amber-950/30 text-amber-100/90"
      } ${className}`}
    >
      <p>
        Entry fees use your <strong className="font-medium text-white">vault balance only</strong>.
        C.A.R.L does not debit ATOM from your wallet except for transaction gas — deposit to your
        vault before escrowing an NFT.
      </p>
      <p className="mt-2 text-xs">
        {loading
          ? "Checking vault…"
          : ready
            ? `Vault: ${formatAtom(vaultUatom)} ATOM · entry costs ${ENTRY_FEE_ATOM} ATOM`
            : `Vault: ${formatAtom(vaultUatom)} ATOM — need at least ${ENTRY_FEE_ATOM} ATOM to enter`}
      </p>
    </div>
  );
}
