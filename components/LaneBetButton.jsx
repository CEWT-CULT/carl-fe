"use client";

import { useState, useRef, useEffect } from "react";
import { useExec } from "@/hooks/useExec";
import {
  useRaceGlobal,
  useSideBet,
  useUser,
  useConfig,
} from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { isBettingOpen } from "@/utils/phases";
import { useNowSec } from "@/hooks/useNowSec";
import { formatAtom, shortRunnerName } from "@/utils/race";
import { speciesKey } from "@/utils/species";

const DEFAULT_AMOUNT = "0.01";

export default function LaneBetButton({ runner }) {
  const { address } = useChain(CHAIN_NAME);
  const { value: race } = useRaceGlobal();
  const { value: config } = useConfig();
  const nowSec = useNowSec();
  const raceId = race?.current_race_id ?? 0;
  const bettingOpen = race ? isBettingOpen(race, config, nowSec) : false;

  const { value: myBet } = useSideBet(raceId, address);
  const { value: user } = useUser(address);
  const { placeSideBet } = useExec();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const popoverRef = useRef(null);

  const connected = !!address;
  const alreadyBet = connected && !!myBet;
  const player = runner?.player;
  const showButton = connected && bettingOpen && !alreadyBet && player;

  const vaultUatom = Number(user?.deposits ?? 0);
  const amountUatom = Math.floor(parseFloat(amount || "0") * 1_000_000);
  const hasValidAmount = amountUatom > 0;
  const hasVaultFunds = vaultUatom >= amountUatom;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  if (!showButton) return null;

  const species = speciesKey(runner);
  const label = shortRunnerName(player, species);

  const handlePlace = (e) => {
    e.stopPropagation();
    if (!hasValidAmount || !hasVaultFunds || placeSideBet.isPending) return;
    placeSideBet.mutate(
      { betType: "racer_victory", amountUatom, pick: player },
      { onSuccess: () => setOpen(false) }
    );
  };

  return (
    <div ref={popoverRef} className="relative shrink-0">
      <button
        type="button"
        title={`Bet on ${label}`}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="h-8 w-8 rounded-full border-2 border-yellow-400/80 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-black shadow-lg shadow-black/40 transition-colors"
        aria-label={`Bet on ${label}`}
      >
        $
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 mb-2 z-30 w-52 rounded-lg border border-gray-600 bg-gray-900 p-3 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-gray-400 mb-1">Bet on racer</p>
          <p className="text-sm font-semibold text-white truncate mb-2">{label}</p>
          <label className="text-[10px] text-gray-500 uppercase tracking-wide">Amount (ATOM)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mt-1 mb-2 bg-gray-950 border border-gray-700 text-white text-sm p-2 rounded"
          />
          {hasValidAmount && !hasVaultFunds && (
            <p className="text-rose-400 text-xs mb-2">Deposit to vault first.</p>
          )}
          <button
            type="button"
            onClick={handlePlace}
            disabled={placeSideBet.isPending || !hasValidAmount || !hasVaultFunds}
            className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-bold py-2 rounded"
          >
            {placeSideBet.isPending ? "Placing…" : `Bet ${formatAtom(amountUatom)}`}
          </button>
        </div>
      )}
    </div>
  );
}
