"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
import { useSideBetAmount } from "@/hooks/useSideBetAmount";
import SideBetAmountField from "@/components/SideBetAmountField";

function usePopoverPosition(open, anchorRef, popoverRef) {
  const [style, setStyle] = useState(null);

  const update = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const rect = anchor.getBoundingClientRect();
    const popH = popover.offsetHeight;
    const popW = popover.offsetWidth;
    const gap = 8;
    const pad = 8;

    let top = rect.top - popH - gap;
    let left = rect.left;

    if (top < pad) {
      top = rect.bottom + gap;
    }
    if (left + popW > window.innerWidth - pad) {
      left = window.innerWidth - popW - pad;
    }
    if (left < pad) left = pad;

    setStyle({
      position: "fixed",
      top: `${Math.round(top)}px`,
      left: `${Math.round(left)}px`,
      zIndex: 9999,
    });
  }, [anchorRef, popoverRef]);

  useEffect(() => {
    if (!open) {
      setStyle(null);
      return;
    }
    update();
    const raf = requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return style;
}

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
  const { amount, setAmount, amountUatom, hasValidAmount } = useSideBetAmount();

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const anchorRef = useRef(null);
  const popoverRef = useRef(null);

  const connected = !!address;
  const alreadyBet = connected && !!myBet;
  const player = runner?.player;
  const showButton = connected && bettingOpen && !alreadyBet && player;

  const vaultUatom = Number(user?.deposits ?? 0);
  const hasVaultFunds = vaultUatom >= amountUatom;

  const popoverStyle = usePopoverPosition(open, anchorRef, popoverRef);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      const t = e.target;
      if (
        anchorRef.current?.contains(t) ||
        popoverRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
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

  const popover =
    open && mounted ? (
      <div
        ref={popoverRef}
        style={popoverStyle ?? { position: "fixed", visibility: "hidden", zIndex: 9999 }}
        className="w-56 rounded-lg border border-gray-600 bg-gray-900 p-3 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Bet on ${label}`}
      >
        <p className="text-xs text-gray-400 mb-1">Individual racer bet</p>
        <p className="text-sm font-semibold text-white truncate mb-2">{label}</p>
        <SideBetAmountField
          id={`lane-bet-amount-${player}`}
          amount={amount}
          onChange={setAmount}
          vaultUatom={vaultUatom}
          amountUatom={amountUatom}
          hasValidAmount={hasValidAmount}
          compact
          className="mb-2"
        />
        <button
          type="button"
          onClick={handlePlace}
          disabled={placeSideBet.isPending || !hasValidAmount || !hasVaultFunds}
          className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-800 disabled:text-gray-500 text-white text-sm font-bold py-2 rounded"
        >
          {placeSideBet.isPending
            ? "Placing…"
            : hasValidAmount
              ? `Wager ${formatAtom(amountUatom)}`
              : "Enter wager amount"}
        </button>
      </div>
    ) : null;

  return (
    <>
      <div ref={anchorRef} className="relative shrink-0 z-[2]">
        <button
          type="button"
          title={`Bet on ${label}`}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          className="h-8 w-8 rounded-full border-2 border-yellow-400/80 bg-yellow-600 hover:bg-yellow-500 text-white text-xs font-black shadow-lg shadow-black/40 transition-colors"
          aria-label={`Bet on ${label}`}
          aria-expanded={open}
        >
          $
        </button>
      </div>
      {mounted && popover ? createPortal(popover, document.body) : null}
    </>
  );
}
