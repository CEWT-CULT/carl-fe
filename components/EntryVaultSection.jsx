"use client";

import { ENTRY_FEE_ATOM } from "@/config";
import VaultEntryFundsNotice, { hasVaultEntryFunds } from "@/components/VaultEntryFundsNotice";
import VaultManagePanel from "@/components/VaultManagePanel";

export default function EntryVaultSection({ vaultUatom, loading = false, className = "" }) {
  const ready = hasVaultEntryFunds(vaultUatom);

  return (
    <section className={`space-y-3 ${className}`}>
      <VaultEntryFundsNotice vaultUatom={vaultUatom} loading={loading} />
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Vault</p>
        <VaultManagePanel
          initialAmount={ready ? "0.1" : String(ENTRY_FEE_ATOM)}
          defaultMode="deposit"
        />
      </div>
    </section>
  );
}
