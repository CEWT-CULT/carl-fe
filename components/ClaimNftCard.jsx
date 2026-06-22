"use client";

import { useState } from "react";
import { useExec } from "@/hooks/useExec";
import { useEscrowVault, useRaceGlobal } from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { speciesInitial, speciesKey } from "@/utils/species";

function vaultStatus(entry, raceId, currentRaceId, isCurrentSettled) {
  if (entry.nft_claimed) {
    return { key: "claimed", label: "Returned", canSelect: false };
  }
  if (entry.final_rank != null) {
    return { key: "claimable", label: `Rank #${entry.final_rank}`, canSelect: true };
  }
  if (raceId === currentRaceId && !isCurrentSettled) {
    return { key: "racing", label: "In race", canSelect: false };
  }
  return { key: "pending", label: "Awaiting settle", canSelect: false };
}

const STATUS_STYLES = {
  claimable: "border-purple-500 ring-2 ring-purple-400/40 bg-purple-950/30",
  racing: "border-amber-600/60 bg-amber-950/20",
  pending: "border-gray-600 bg-gray-800/80",
  claimed: "border-gray-700 bg-gray-900/50 opacity-50",
  selected: "border-purple-400 ring-2 ring-purple-300 bg-purple-900/50",
};

function VaultSlot({ item, selected, onSelect, currentRaceId, isCurrentSettled }) {
  const { raceId, entry } = item;
  const status = vaultStatus(entry, raceId, currentRaceId, isCurrentSettled);
  const species = speciesKey({ species: entry.species }) ?? "runner";
  const initial = speciesInitial(entry.species);
  const isSelected = selected === raceId;

  const cardClass = isSelected
    ? STATUS_STYLES.selected
    : STATUS_STYLES[status.key] ?? STATUS_STYLES.pending;

  return (
    <button
      type="button"
      disabled={!status.canSelect}
      onClick={() => status.canSelect && onSelect(raceId)}
      className={`relative flex flex-col items-center rounded-lg border p-3 transition-all text-left w-full ${cardClass} ${
        status.canSelect ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg" : "cursor-default"
      }`}
    >
      <div className="w-16 h-16 rounded-md bg-gray-900/60 border border-gray-600/50 flex items-center justify-center text-xl font-bold text-gray-300 mb-2 shadow-inner">
        {initial}
      </div>
      <p className="text-white font-semibold text-sm truncate w-full text-center">
        {species.charAt(0).toUpperCase() + species.slice(1)} #{entry.nft_id}
      </p>
      <p className="text-gray-500 text-xs font-mono mt-0.5">Race #{raceId}</p>
      <span
        className={`mt-2 text-[10px] uppercase tracking-wide font-medium px-2 py-0.5 rounded ${
          status.key === "claimable"
            ? "bg-purple-800 text-purple-200"
            : status.key === "racing"
              ? "bg-amber-900/80 text-amber-200"
              : status.key === "claimed"
                ? "bg-gray-700 text-gray-400"
                : "bg-gray-700 text-gray-400"
        }`}
      >
        {status.label}
      </span>
      {status.canSelect && (
        <p className="text-purple-300/70 text-[10px] mt-2">Click to select</p>
      )}
    </button>
  );
}

export default function ClaimNftCard() {
  const { address } = useChain(CHAIN_NAME);
  const { value: race } = useRaceGlobal();
  const { items, query } = useEscrowVault(address);
  const { claimRacerNft } = useExec();
  const [selectedRaceId, setSelectedRaceId] = useState(null);

  const currentRaceId = race?.current_race_id;
  const isCurrentSettled = race?.is_settled;

  const activeVault = items.filter((i) => !i.entry.nft_claimed);

  const claimable = activeVault.filter((i) => i.entry.final_rank != null);

  const handleClaim = () => {
    if (!selectedRaceId) return;
    claimRacerNft.mutate(
      { raceId: selectedRaceId },
      {
        onSuccess: () => {
          setSelectedRaceId(null);
          query.refetch();
        },
      }
    );
  };

  return (
    <div className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
      <h2 className="text-lg font-bold text-white mb-1">Withdraw NFT</h2>
      <p className="text-gray-500 text-sm mb-4">
        Escrowed racers appear here until you withdraw after settlement. Returned tokens leave this
        list immediately.
      </p>

      {query.isLoading && (
        <p className="text-gray-500 text-sm py-8 text-center">Scanning vault…</p>
      )}

      {!query.isLoading && activeVault.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-600 bg-gray-950/40 p-8 text-center mb-4">
          <p className="text-gray-400 text-sm">No escrowed NFTs right now.</p>
          <p className="text-gray-600 text-xs mt-1">Enter a race to deposit a token here.</p>
        </div>
      )}

      {!query.isLoading && activeVault.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
            <span>
              {claimable.length} ready to withdraw · {activeVault.length} in vault
            </span>
          </div>

          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4 rounded-lg border border-gray-700 bg-gradient-to-b from-gray-900/80 to-gray-950/90 min-h-[8rem] mb-4"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(75,85,99,0.15) 48px, rgba(75,85,99,0.15) 49px)",
            }}
          >
            {activeVault.map((item) => (
              <VaultSlot
                key={`${item.raceId}-${item.entry.nft_id}`}
                item={item}
                selected={selectedRaceId}
                onSelect={setSelectedRaceId}
                currentRaceId={currentRaceId}
                isCurrentSettled={isCurrentSettled}
              />
            ))}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={handleClaim}
        disabled={claimRacerNft.isPending || selectedRaceId == null}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg transition-colors"
      >
        {claimRacerNft.isPending
          ? "Withdrawing…"
          : selectedRaceId
            ? `Withdraw NFT from Race #${selectedRaceId}`
            : claimable.length > 0
              ? "Select an NFT above to withdraw"
              : "No NFTs ready to withdraw"}
      </button>
    </div>
  );
}
