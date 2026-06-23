"use client";

import { useCallback, useEffect, useState } from "react";
import {
  parseSideBetAmountAtom,
  readStoredSideBetAmount,
  writeStoredSideBetAmount,
} from "@/utils/sideBetAmount";

/** Shared side-bet amount (ATOM string) — synced across desk + lane popovers. */
export function useSideBetAmount() {
  const [amount, setAmountState] = useState("");

  useEffect(() => {
    const stored = readStoredSideBetAmount();
    if (stored) setAmountState(stored);
  }, []);

  const setAmount = useCallback((next) => {
    setAmountState(next);
    writeStoredSideBetAmount(next);
  }, []);

  const amountUatom = parseSideBetAmountAtom(amount);
  const hasValidAmount = amountUatom > 0;

  return { amount, setAmount, amountUatom, hasValidAmount };
}
