"use client";

import { CHAIN_NAME } from "@/config";
import { useChain } from "@/hooks/useChainClient";
import { ACTION } from "@/utils/raceTheme";
import VaultManagePanel from "@/components/VaultManagePanel";

export default function VaultBar({ onEnterRace, enterDisabled, enterHint }) {
  const { status } = useChain(CHAIN_NAME);

  if (status !== "Connected") return null;

  return (
    <section id="vault" className="w-full bg-carl-slate border border-carl-purple/25 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-end gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-carl-text uppercase tracking-wider mb-3">Vault</h2>
          <VaultManagePanel />
        </div>

        <div className="lg:w-72 shrink-0">
          <button
            type="button"
            onClick={onEnterRace}
            disabled={enterDisabled}
            className="w-full bg-carl-purple hover:bg-carl-navy disabled:bg-carl-midnight disabled:text-carl-muted border border-carl-accent/35 text-white font-black text-lg py-4 px-6 rounded-xl shadow-lg shadow-carl-plum/40 transition-colors"
          >
            {ACTION.enterRace}
          </button>
          {enterHint && (
            <p className="text-xs text-center text-carl-muted mt-2">{enterHint}</p>
          )}
        </div>
      </div>
    </section>
  );
}
