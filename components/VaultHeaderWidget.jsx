"use client";

import { useState } from "react";
import { CHAIN_NAME } from "@/config";
import { useChain } from "@/hooks/useChainClient";
import { useUser } from "@/hooks";
import { formatAtom } from "@/utils/race";
import VaultManagePanel from "@/components/VaultManagePanel";

export default function VaultHeaderWidget() {
  const { address, status } = useChain(CHAIN_NAME);
  const [open, setOpen] = useState(false);
  const { value: user, query: userQuery } = useUser(address);

  if (status !== "Connected") return null;

  const vaultLabel = userQuery.isLoading ? "…" : `${formatAtom(user?.deposits)} ATOM`;

  return (
    <>
      <div className="flex items-center gap-2">
        <div
          className="rounded-lg border border-carl-purple/40 bg-carl-midnight/80 px-2.5 py-1.5 sm:px-3"
          title="Race vault balance"
        >
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-carl-muted leading-none">
            Vault
          </p>
          <p className="mt-0.5 text-xs sm:text-sm font-mono font-semibold text-carl-text tabular-nums whitespace-nowrap">
            {vaultLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-carl-accent/35 bg-carl-purple px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-carl-navy transition-colors"
        >
          Manage
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 px-4 py-8 sm:py-12 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vault-manage-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-carl-purple/40 bg-carl-slate p-5 shadow-xl shadow-carl-plum/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 id="vault-manage-title" className="text-sm font-bold text-carl-text uppercase tracking-wider">
                Vault
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-carl-muted hover:text-carl-text text-sm font-medium"
              >
                Close
              </button>
            </div>
            <p className="text-carl-muted text-xs mb-4">
              Isolate race funds from your wallet. Entry fees and side bets use vault balance.
            </p>
            <VaultManagePanel />
          </div>
        </div>
      )}
    </>
  );
}
